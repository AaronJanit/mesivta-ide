import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { listFiles } from "@/lib/db/files";
import { getProject } from "@/lib/db/projects";
import type { FileNode } from "@/lib/db/types";

export const runtime = "nodejs";

const MIME_TYPES: Record<string, string> = {
  html: "text/html; charset=utf-8",
  htm: "text/html; charset=utf-8",
  css: "text/css; charset=utf-8",
  js: "application/javascript; charset=utf-8",
  mjs: "application/javascript; charset=utf-8",
  json: "application/json; charset=utf-8",
  xml: "application/xml; charset=utf-8",
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  ico: "image/x-icon",
  webm: "video/webm",
  mp4: "video/mp4",
  ogg: "audio/ogg",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  woff: "font/woff",
  woff2: "font/woff2",
  ttf: "font/ttf",
  otf: "font/otf",
  eot: "application/vnd.ms-fontobject",
  txt: "text/plain; charset=utf-8",
  md: "text/markdown; charset=utf-8",
  pdf: "application/pdf",
  map: "application/json",
};

function getMimeType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return MIME_TYPES[ext] ?? "application/octet-stream";
}

/**
 * Walk the virtual file tree to find a file at the given path.
 * For directories, returns index.html inside if it exists.
 */
function resolveFile(tree: FileNode[], pathParts: string[]): FileNode | null {
  let nodes = tree;

  for (let i = 0; i < pathParts.length; i++) {
    const segment = pathParts[i];
    const found = nodes.find((n) => n.name === segment);

    if (!found) return null;

    if (found.type === "folder") {
      // If this is the last segment, try index.html inside
      if (i === pathParts.length - 1) {
        const index = found.children?.find((c) => c.name === "index.html" && c.type === "file");
        return index ?? null;
      }
      nodes = found.children ?? [];
    } else {
      // It's a file — must be the last segment
      return found;
    }
  }

  // Empty path → root index.html
  return tree.find((n) => n.name === "index.html" && n.type === "file") ?? null;
}

/**
 * GET /api/serve/[projectId]/[...path]
 *
 * Serves project files for the simulated localhost preview.
 * The projectId is the first path segment; the rest is the virtual file path.
 * Relative links in HTML naturally resolve through the URL path,
 * so no rewriting is needed.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ segments?: string[] }> },
) {
  const sess = await getSession();
  if (!sess) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { segments = [] } = await params;

  // segments[0] = projectId, segments[1...] = file path
  if (segments.length === 0) {
    return NextResponse.json({ error: "projectId required" }, { status: 400 });
  }

  const projectId = segments[0];
  const filePath = segments.slice(1); // remaining path segments

  // Verify project ownership
  const project = await getProject(sess.userId, projectId);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Load project file tree
  const tree = await listFiles(sess.userId, projectId);

  // Resolve file path
  const file = resolveFile(tree, filePath);

  if (!file || file.type !== "file" || file.content === null) {
    // If requesting root (no file path), serve default index.html or a placeholder
    if (filePath.length === 0) {
      const indexFile = tree.find((n) => n.name === "index.html" && n.type === "file");
      if (indexFile && indexFile.content !== null) {
        return new Response(indexFile.content, {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-store",
          },
        });
      }
      // No index.html — return a placeholder page
      return new Response(
        `<!DOCTYPE html>
<html><head><title>No index.html</title></head>
<body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#1a1a2e;color:#e0e0e0">
<div style="text-align:center">
<h2>No index.html found</h2>
<p>Create an <code>index.html</code> file to see your project here.</p>
</div></body></html>`,
        {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-store",
          },
        },
      );
    }

    return new Response("404 Not Found", {
      status: 404,
      headers: { "Content-Type": "text/plain" },
    });
  }

  const mimeType = getMimeType(file.name);

  return new Response(file.content, {
    headers: {
      "Content-Type": mimeType,
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
    },
  });
}