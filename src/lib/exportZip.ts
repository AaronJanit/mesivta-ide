import { zipSync, strToU8, type Zippable, type ZipOptions } from "fflate";
import type { FileDTO } from "@/lib/api/client";

export interface ExportResult {
  blob: Blob;
  fileName: string;
  fileCount: number;
  folderCount: number;
}

/**
 * Build a .zip of the given project tree client-side (fflate).
 * Folders become zip directory entries; text files become deflate entries.
 */
export function buildProjectZip(tree: FileDTO[], projectName: string): ExportResult {
  const zip: Zippable = {};
  let fileCount = 0;
  const folders = new Set<string>();

  const walk = (nodes: FileDTO[], prefix: string) => {
    for (const node of nodes) {
      const path = prefix ? `${prefix}/${node.name}` : node.name;
      if (node.type === "folder") {
        // Explicit directory entries make the zip self-describing.
        const dirOpts: [Uint8Array, ZipOptions] = [strToU8(""), { level: 0 }];
        zip[`${path}/`] = dirOpts;
        folders.add(path);
        if (node.children) walk(node.children, path);
      } else {
        zip[path] = strToU8(node.content ?? "");
        fileCount++;
      }
    }
  };
  walk(tree, "");

  const safeName =
    projectName.trim().replace(/[^\w\- ]+/g, "").replace(/\s+/g, "-").toLowerCase() || "project";

  const u8 = zipSync(zip, { level: 6 });
  const blob = new Blob([u8 as unknown as BlobPart], { type: "application/zip" });
  return { blob, fileName: `${safeName}.zip`, fileCount, folderCount: folders.size };
}

/** Trigger a browser download for a Blob. */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}