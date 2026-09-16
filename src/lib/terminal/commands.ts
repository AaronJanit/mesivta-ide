import type { FileNode } from "@/lib/db/types";
import { resolvePath, pathToNode, listDir, parentDir, basename, buildPathMap, formatSize } from "./pathUtils";
import { parseCommand, type ParsedCommand } from "./parser";

export interface CommandResult {
  output: string;       // text to display
  clear?: boolean;      // if true, clear terminal history
  serverStart?: { port: number }; // if set, a dev server is now running
  serverStop?: boolean;  // if set, kill the running server
  openFile?: string;     // if set, open this file path in the editor
  newFiles?: FileNode[];  // files created during command execution
  // Side-effect fields that the store will handle
  newCwd?: string;
  mkdir?: { parentPath: string; name: string };
  touch?: { parentPath: string; name: string };
  rm?: { id: string; name: string };
  mv?: { id: string; newName: string; newParentPath: string };
  writeToFile?: { path: string; content: string };
}

const NO_OUTPUT: CommandResult = { output: "" };

/**
 * Execute a parsed command against the virtual filesystem.
 * `cwd` is the current working directory (absolute virtual path).
 * `tree` is the current project file tree.
 * `projectName` is used for the prompt display.
 */
export function executeCommand(
  parsed: ParsedCommand,
  cwd: string,
  tree: FileNode[],
  projectName: string,
  serverRunning: boolean,
): CommandResult {
  const { command, args, redirectTo } = parsed;

  if (!command) return NO_OUTPUT;

  switch (command) {
    case "help":
      return cmdHelp();
    case "man":
      return cmdMan(args[0] ?? "");
    case "clear":
      return { output: "", clear: true };
    case "pwd":
      return { output: cwd + "\n" };
    case "cd":
      return cmdCd(args[0], cwd, tree);
    case "ls":
      return cmdLs(args, cwd, tree);
    case "mkdir":
      return cmdMkdir(args[0], cwd, tree);
    case "touch":
      return cmdTouch(args[0], cwd, tree);
    case "cat":
      return cmdCat(args[0], cwd, tree);
    case "rm":
      return cmdRm(args[0], cwd, tree);
    case "mv":
      return cmdMv(args[0], args[1], cwd, tree);
    case "echo":
      return cmdEcho(args, redirectTo, cwd, tree);
    case "code":
      return cmdCode(args[0], cwd, tree);
    case "npm":
      return cmdNpm(args, cwd, tree, serverRunning);
    case "whoami":
      return { output: "student\n" };
    case "date":
      return { output: new Date().toLocaleString() + "\n" };
    case "hostname":
      return { output: "mesivta-ide\n" };
    case "uname":
      return cmdUname(args);
    case "which":
      return cmdWhich(args[0]);
    case "tree":
      return cmdTree(cwd, tree);
    case "exit":
      return { output: "This terminal cannot be closed. Type 'help' for available commands.\n" };
    default:
      return { output: `bash: ${command}: command not found\n` };
  }
}

// ─── Command implementations ─────────────────────────────────────────

function cmdHelp(): CommandResult {
  return {
    output: [
      "Available commands:",
      "",
      "  Navigation:",
      "    cd <dir>         Change directory",
      "    pwd              Print working directory",
      "    ls [-la]         List directory contents",
      "    tree             Show directory tree",
      "",
      "  File operations:",
      "    mkdir <name>     Create a new folder",
      "    touch <name>     Create a new empty file",
      "    cat <file>       Display file contents",
      "    rm <path>        Delete a file or folder",
      "    mv <src> <dest>  Move or rename a file",
      "    echo <text>      Print text (use > file to write)",
      "",
      "  Development:",
      "    npm start        Start the development server",
      "    npm install      Install dependencies (simulated)",
      "    npm run build    Build the project (simulated)",
      "    npm init         Create a package.json",
      "    code <file>      Open a file in the editor",
      "",
      "  Other:",
      "    clear            Clear the terminal",
      "    help             Show this help message",
      "    man <cmd>        Show help for a specific command",
      "    whoami           Show current user",
      "    date             Show current date and time",
      "",
    ].join("\n"),
  };
}

function cmdMan(cmd: string): CommandResult {
  const manPages: Record<string, string> = {
    cd: "cd <dir>\n  Change the current directory. Use '..' to go up, '/' for root.\n  Example: cd css  — go into the css folder\n  Example: cd ..  — go up one level",
    pwd: "pwd\n  Print the full path of the current directory.",
    ls: "ls [-la]\n  List files and folders in the current directory.\n  -l  Show detailed info (permissions, size, date)\n  -a  Show hidden files (currently none)",
    mkdir: "mkdir <name>\n  Create a new folder in the current directory.\n  Example: mkdir images",
    touch: "touch <name>\n  Create a new empty file in the current directory.\n  Example: touch about.html",
    cat: "cat <file>\n  Display the contents of a file.\n  Example: cat index.html",
    rm: "rm <path>\n  Delete a file or folder (and all its contents).\n  Example: rm old-page.html",
    mv: "mv <source> <destination>\n  Move or rename a file or folder.\n  Example: mv style.css css/style.css",
    echo: "echo <text>\n  Print text to the terminal. Use > to write to a file.\n  Example: echo Hello World\n  Example: echo '<h1>Hello</h1>' > index.html",
    npm: "npm <command>\n  Run a package manager command.\n  start    Start the development server\n  install  Install dependencies (simulated)\n  run build Build the project (simulated)\n  init     Create a package.json file",
    code: "code <file>\n  Open a file in the code editor.\n  Example: code index.html",
    clear: "clear\n  Clear all text from the terminal screen.",
    tree: "tree\n  Display the project directory structure.",
  };
  if (!cmd) return { output: "What manual page do you want?\nFor example, try 'man ls'.\n" };
  return { output: manPages[cmd] ?? `No manual entry for ${cmd}\n` };
}

function cmdCd(target: string | undefined, cwd: string, tree: FileNode[]): CommandResult {
  if (!target || target === "~") {
    return { output: "", newCwd: "/" }; // root is home
  }
  const resolved = resolvePath(cwd, target);
  const node = pathToNode(resolved, tree);
  if (!node) {
    return { output: `bash: cd: ${target}: No such file or directory\n` };
  }
  if (node.type !== "folder") {
    return { output: `bash: cd: ${target}: Not a directory\n` };
  }
  return { output: "", newCwd: resolved };
}

function cmdLs(args: string[], cwd: string, tree: FileNode[]): CommandResult {
  const longFormat = args.includes("-l") || args.includes("-la") || args.includes("-la");
  const targetPath = args.find((a) => !a.startsWith("-")) ?? cwd;
  const resolved = resolvePath(cwd, targetPath);
  const entries = listDir(resolved, tree);

  if (entries === null) {
    return { output: `ls: cannot access '${targetPath}': No such file or directory\n` };
  }

  if (longFormat) {
    const lines = entries.map((e) => {
      const perm = e.type === "folder" ? "drwxr-xr-x" : "-rw-r--r--";
      const size = e.content ? formatSize(e.content.length) : "0";
      const date = new Date(e.updated_at ?? e.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      return `${perm}  1 student student ${size.padStart(6)}  ${date}  ${e.name}${e.type === "folder" ? "/" : ""}`;
    });
    if (lines.length === 0) return { output: `total 0\n` };
    return { output: `total ${entries.length}\n${lines.join("\n")}\n` };
  }

  // Short format: names in columns
  if (entries.length === 0) return { output: "" };
  const names = entries.map((e) => e.name + (e.type === "folder" ? "/" : ""));
  return { output: names.join("  ") + "\n" };
}

function cmdMkdir(name: string | undefined, cwd: string, tree: FileNode[]): CommandResult {
  if (!name) return { output: "mkdir: missing operand\n" };
  if (name.includes("/")) return { output: `mkdir: cannot create directory '${name}': nested paths not supported yet\n` };
  const existing = listDir(cwd, tree);
  if (existing?.some((e) => e.name === name)) {
    return { output: `mkdir: cannot create directory '${name}': File exists\n` };
  }
  // Return signal to caller to create folder via API
  return { output: "", mkdir: { parentPath: cwd, name } };
}

function cmdTouch(name: string | undefined, cwd: string, tree: FileNode[]): CommandResult {
  if (!name) return { output: "touch: missing file operand\n" };
  if (name.includes("/")) return { output: `touch: cannot create '${name}': nested paths not supported yet\n` };
  const existing = listDir(cwd, tree);
  if (existing?.some((e) => e.name === name)) {
    // touch on existing file is a no-op (in real bash it updates mtime)
    return NO_OUTPUT;
  }
  return { output: "", touch: { parentPath: cwd, name } };
}

function cmdCat(path: string | undefined, cwd: string, tree: FileNode[]): CommandResult {
  if (!path) return { output: "cat: missing file operand\n" };
  const resolved = resolvePath(cwd, path);
  const node = pathToNode(resolved, tree);
  if (!node) return { output: `cat: ${path}: No such file or directory\n` };
  if (node.type === "folder") return { output: `cat: ${path}: Is a directory\n` };
  if (node.content === null) return { output: "" }; // empty file
  return { output: node.content + "\n" };
}

function cmdRm(path: string | undefined, cwd: string, tree: FileNode[]): CommandResult {
  if (!path) return { output: "rm: missing operand\n" };
  const resolved = resolvePath(cwd, path);
  const node = pathToNode(resolved, tree);
  if (!node) return { output: `rm: cannot remove '${path}': No such file or directory\n` };
  return { output: "", rm: { id: node.id, name: node.name } };
}

function cmdMv(src: string | undefined, dest: string | undefined, cwd: string, tree: FileNode[]): CommandResult {
  if (!src) return { output: "mv: missing source operand\n" };
  if (!dest) return { output: "mv: missing destination operand\n" };
  const srcResolved = resolvePath(cwd, src);
  const srcNode = pathToNode(srcResolved, tree);
  if (!srcNode) return { output: `mv: cannot stat '${src}': No such file or directory\n` };

  const destResolved = resolvePath(cwd, dest);
  const destNode = pathToNode(destResolved, tree);

  // If dest is an existing folder, move into it keeping the same name
  if (destNode?.type === "folder") {
    return { output: "", mv: { id: srcNode.id, newName: srcNode.name, newParentPath: destResolved } };
  }

  // If dest doesn't exist, it's a rename
  const destParent = parentDir(destResolved);
  const destName = basename(destResolved);
  return { output: "", mv: { id: srcNode.id, newName: destName, newParentPath: destParent } };
}

function cmdEcho(args: string[], redirectTo: string | null, cwd: string, tree: FileNode[]): CommandResult {
  const text = args.join(" ");
  if (!redirectTo) {
    return { output: text + "\n" };
  }
  // echo text > file — write to file
  return { output: "", writeToFile: { path: resolvePath(cwd, redirectTo), content: text + "\n" } };
}

function cmdCode(path: string | undefined, cwd: string, tree: FileNode[]): CommandResult {
  if (!path) return { output: "code: missing file operand\nUsage: code <filename>\n" };
  const resolved = resolvePath(cwd, path);
  const node = pathToNode(resolved, tree);
  if (!node) return { output: `code: ${path}: No such file or directory\n` };
  if (node.type === "folder") return { output: `code: ${path}: Is a directory\n` };
  return { output: `Opening ${path} in editor...\n`, openFile: node.id };
}

function cmdNpm(args: string[], cwd: string, tree: FileNode[], serverRunning: boolean): CommandResult {
  const sub = args[0];

  switch (sub) {
    case "start":
    case "run":
    case "dev": {
      const cmd = sub === "start" ? "start" : sub === "dev" ? "dev" : args[1] ?? "";
      if (cmd === "start" || cmd === "dev") {
        if (serverRunning) {
          return { output: "\x1b[33m⚠  Server is already running on http://localhost:3000\x1b[0m\nPress Ctrl+C to stop it first.\n" };
        }
        return {
          output: [
            "",
            "\x1b[32m  VITE v6.0.0\x1b[0m  ready in \x1b[1m320ms\x1b[0m",
            "",
            "  ➜  \x1b[1mLocal\x1b[0m:   \x1b[36mhttp://localhost:3000/\x1b[0m",
            "  ➜  \x1b[1mNetwork\x1b[0m: \x1b[2muse --host to expose\x1b[0m",
            "  ➜  press \x1b[1mh + enter\x1b[0m to show help",
            "",
          ].join("\n"),
          serverStart: { port: 3000 },
        };
      }
      if (cmd === "build") {
        return cmdNpmBuild();
      }
      return { output: `npm run ${cmd}\n\x1b[31mError: Unknown script "${cmd}"\x1b[0m\nAvailable scripts:\n  start   Start the development server\n  build   Build the project\n` };
    }
    case "install":
    case "i": {
      return {
        output: [
          "\x1b[2madded 1 package in 2s\x1b[0m",
          "",
          "\x1b[32m✓\x1b[0m Dependencies installed successfully",
        ].join("\n") + "\n",
      };
    }
    case "init": {
      // Check if package.json already exists
      const existing = listDir(cwd, tree);
      if (existing?.some((e) => e.name === "package.json")) {
        return { output: "\x1b[33m⚠ package.json already exists\x1b[0m\n" };
      }
      const pkgJson = JSON.stringify({
        name: "my-project",
        version: "1.0.0",
        description: "",
        scripts: { start: "vite", build: "vite build" },
      }, null, 2);
      return { output: "Wrote to package.json\n", writeToFile: { path: resolvePath(cwd, "package.json"), content: pkgJson } };
    }
    case "run": {
      const script = args[1];
      if (script === "build") return cmdNpmBuild();
      if (script === "start" || script === "dev") return cmdNpm(["start"], cwd, tree, serverRunning);
      return { output: `npm run ${script ?? ""}\n\x1b[31mError: Unknown script "${script}"\x1b[0m\n` };
    }
    default:
      return { output: `npm: '${sub}' is not a npm command.\nSee 'npm help' for available commands.\n` };
  }
}

function cmdNpmBuild(): CommandResult {
  return {
    output: [
      "\x1b[2mvite v6.0.0 building for production...\x1b[0m",
      "\x1b[32m✓\x1b[0m 8 modules transformed.",
      "dist/index.html           \x1b[2m0.12 kB\x1b[0m │ gzip: 0.10 kB",
      "dist/assets/index.css     \x1b[2m1.24 kB\x1b[0m │ gzip: 0.45 kB",
      "dist/assets/index.js     \x1b[2m4.56 kB\x1b[0m │ gzip: 1.89 kB",
      "\x1b[32m✓ built in 842ms\x1b[0m",
    ].join("\n") + "\n",
  };
}

function cmdUname(args: string[]): CommandResult {
  if (args.includes("-a")) {
    return { output: "MesivtaIDE 1.0.0 MesivtaIDE-Web x86_64 GNU/Linux\n" };
  }
  return { output: "MesivtaIDE\n" };
}

function cmdWhich(cmd: string | undefined): CommandResult {
  if (!cmd) return { output: "which: missing argument\n" };
  const builtins = ["cd", "pwd", "ls", "mkdir", "touch", "cat", "rm", "mv", "echo", "clear", "help", "man", "code", "npm", "whoami", "date", "hostname", "uname", "which", "tree"];
  if (builtins.includes(cmd)) {
    return { output: `/usr/bin/${cmd}\n` };
  }
  return { output: `${cmd} not found\n` };
}

function cmdTree(cwd: string, tree: FileNode[]): CommandResult {
  const entries = listDir(cwd, tree);
  if (entries === null) {
    return { output: `tree: ${cwd}: No such directory\n` };
  }

  const lines: string[] = [cwd === "/" ? "." : basename(cwd)];

  function walk(nodes: FileNode[], prefix: string) {
    nodes.forEach((node, i) => {
      const isLast = i === nodes.length - 1;
      const connector = isLast ? "└── " : "├── ";
      lines.push(`${prefix}${connector}${node.name}${node.type === "folder" ? "/" : ""}`);
      if (node.children && node.children.length > 0) {
        const newPrefix = prefix + (isLast ? "    " : "│   ");
        walk(node.children, newPrefix);
      }
    });
  }

  walk(entries, "");
  lines.push(`\n${countItems(tree)} directories, ${countFiles(tree)} files`);
  return { output: lines.join("\n") + "\n" };
}

function countItems(nodes: FileNode[]): number {
  return nodes.filter((n) => n.type === "folder").reduce((a, n) => a + 1 + countItems(n.children ?? []), 0);
}

function countFiles(nodes: FileNode[]): number {
  return nodes.reduce((a, n) => a + (n.type === "file" ? 1 : countFiles(n.children ?? [])), 0);
}