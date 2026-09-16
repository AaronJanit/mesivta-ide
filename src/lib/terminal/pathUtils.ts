import type { FileNode } from "@/lib/db/types";

/**
 * Resolve a possibly-relative path against a cwd, returning an absolute
 * virtual path like "/project/my-site/css/style.css".
 * Handles `.`, `..`, trailing slashes, and duplicate slashes.
 */
export function resolvePath(cwd: string, input: string): string {
  // Treat leading `/` as absolute; anything else is relative to cwd
  const parts = input.startsWith("/")
    ? input.split("/")
    : [...cwd.split("/"), ...input.split("/")];

  const stack: string[] = [];
  for (const p of parts) {
    if (p === "" || p === ".") continue;
    if (p === "..") {
      stack.pop();
    } else {
      stack.push(p);
    }
  }
  return "/" + stack.join("/");
}

/**
 * Given a virtual absolute path and the project file tree, find the
 * corresponding FileNode (or null if not found).
 */
export function pathToNode(
  absolutePath: string,
  tree: FileNode[],
): FileNode | null {
  const parts = absolutePath.split("/").filter(Boolean);
  let nodes = tree;
  let current: FileNode | null = null;

  for (let i = 0; i < parts.length; i++) {
    const name = parts[i];
    const found = nodes.find((n) => n.name === name);
    if (!found) return null;
    current = found;
    nodes = found.children ?? [];
  }
  return current;
}

/**
 * List children of a directory path. Returns the `children` array of the
 * folder node, or the root `tree` if path is "/".
 */
export function listDir(
  absolutePath: string,
  tree: FileNode[],
): FileNode[] | null {
  if (absolutePath === "/") return tree;
  const node = pathToNode(absolutePath, tree);
  if (!node || node.type !== "folder") return null;
  return node.children ?? [];
}

/**
 * Get the parent directory path of a given path.
 */
export function parentDir(path: string): string {
  const parts = path.split("/").filter(Boolean);
  if (parts.length <= 1) return "/";
  parts.pop();
  return "/" + parts.join("/");
}

/**
 * Get the basename (last segment) of a path.
 */
export function basename(path: string): string {
  const parts = path.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? "";
}

/**
 * Build a virtual absolute path for every file/folder in the tree.
 * Returns a Map of absolute path → FileNode.
 */
export function buildPathMap(tree: FileNode[], prefix = ""): Map<string, FileNode> {
  const map = new Map<string, FileNode>();
  for (const node of tree) {
    const path = prefix ? `${prefix}/${node.name}` : `/${node.name}`;
    map.set(path, node);
    if (node.children) {
      const childMap = buildPathMap(node.children, path);
      for (const [k, v] of childMap) map.set(k, v);
    }
  }
  return map;
}

/**
 * Format a file size in human-readable form.
 */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}K`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}M`;
}