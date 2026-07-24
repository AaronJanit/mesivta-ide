import vm from "node:vm";
import type { FileNode } from "@/lib/db/types";

export type DebugLanguage = "html" | "css" | "javascript";

export interface SyntaxIssue {
  fileId: string;
  path: string;
  name: string;
  language: DebugLanguage;
  line: number; // 1-based
  column: number; // 1-based
  message: string;
  excerpt: string; // the offending line(s), raw
  snippet: string; // numbered context with a ^ pointer
}

export interface ScanResult {
  issues: SyntaxIssue[];
  fileCount: number;
  checkedCount: number;
}

// Only "JavaScript" per the spec — plain JS. JSX/TSX/TS are intentionally
// excluded (vm.Script cannot parse them and the request is HTML/CSS/JS only).
const JS_EXTS = new Set(["js", "mjs", "cjs"]);
const CSS_EXTS = new Set(["css", "scss", "less"]);
const HTML_EXTS = new Set(["html", "htm"]);

const VOID_TAGS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta",
  "param", "source", "track", "wbr",
]);

function extOf(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

function langFor(name: string): DebugLanguage | null {
  const e = extOf(name);
  if (HTML_EXTS.has(e)) return "html";
  if (CSS_EXTS.has(e)) return "css";
  if (JS_EXTS.has(e)) return "javascript";
  return null;
}

/** 1-based line / column for a character offset in a string. */
function lineColAt(content: string, offset: number): { line: number; col: number } {
  let line = 1;
  let col = 1;
  for (let i = 0; i < offset && i < content.length; i++) {
    const ch = content[i];
    if (ch === "\n") {
      line++;
      col = 1;
    } else if (ch === "\r") {
      // handled by \n
    } else {
      col++;
    }
  }
  return { line, col };
}

/** Build a numbered snippet (radius lines around `line`) with a `^` pointer. */
function buildSnippet(content: string, line: number, column: number, radius = 2): string {
  const lines = content.split(/\r?\n/);
  const start = Math.max(0, line - 1 - radius);
  const end = Math.min(lines.length, line + radius);
  const width = String(Math.max(end, line)).length;
  const prefixLen = 2 + width + 3; // "> " + width + " | "
  const out: string[] = [];
  for (let i = start; i < end; i++) {
    const ln = i + 1;
    const marker = ln === line ? ">" : " ";
    out.push(`${marker} ${String(ln).padStart(width)} | ${lines[i] ?? ""}`);
    if (ln === line) {
      const pointer = " ".repeat(Math.max(0, prefixLen + (column - 1))) + "^";
      out.push(pointer);
    }
  }
  return out.join("\n");
}

function makeIssue(
  fileId: string,
  path: string,
  name: string,
  language: DebugLanguage,
  content: string,
  line: number,
  column: number,
  message: string,
): SyntaxIssue {
  const lines = content.split(/\r?\n/);
  const excerpt = lines[Math.min(lines.length - 1, Math.max(0, line - 1))] ?? "";
  return {
    fileId,
    path,
    name,
    language,
    line,
    column,
    message,
    excerpt,
    snippet: buildSnippet(content, line, column),
  };
}

// ============================ JavaScript ============================
function checkJavaScript(
  fileId: string,
  path: string,
  name: string,
  content: string,
): SyntaxIssue | null {
  try {
    new vm.Script(content, { filename: path, lineOffset: 0, columnOffset: 0 });
    return null;
  } catch (e) {
    const err = e as Error;
    const msg = err.message || "Syntax error";
    let line = 1;
    let col = 1;
    // V8 SyntaxError stack ends with "(filename:L:C)"
    const m = err.stack?.match(/\((?:.*?):(\d+):(\d+)\)/);
    if (m) {
      line = parseInt(m[1], 10);
      col = parseInt(m[2], 10);
    }
    return makeIssue(fileId, path, name, "javascript", content, line, col, msg);
  }
}

// ============================ CSS ============================
function checkCSS(
  fileId: string,
  path: string,
  name: string,
  content: string,
): SyntaxIssue | null {
  // Strip comments so braces/strings inside them don't confuse the scan.
  const stripped = content.replace(/\/\*[\s\S]*?\*\//g, "");
  const len = stripped.length;
  let line = 1;
  let col = 1;
  let inStr: string | null = null;
  let strStartLine = 1;
  let strStartCol = 1;
  // Track both `{}` (rule blocks) and `()`/`[]` (at-rule params, selectors).
  const stack: { ch: string; line: number; col: number }[] = [];
  const OPEN = new Set(["{", "(", "["]);
  const CLOSE: Record<string, string> = { "}": "{", ")": "(", "]": "[" };

  for (let i = 0; i < len; i++) {
    const ch = stripped[i];
    if (ch === "\n") {
      line++;
      col = 1;
      continue;
    }
    if (inStr) {
      if (ch === "\\") {
        i++;
        col += 2;
        continue;
      }
      if (ch === inStr) inStr = null;
      col++;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inStr = ch;
      strStartLine = line;
      strStartCol = col;
      col++;
      continue;
    }
    if (OPEN.has(ch)) {
      stack.push({ ch, line, col });
      col++;
      continue;
    }
    if (CLOSE[ch]) {
      if (stack.length === 0) {
        return makeIssue(fileId, path, name, "css", content, line, col, `Unexpected closing '${ch}' — no matching opening '${CLOSE[ch]}'`);
      }
      const top = stack[stack.length - 1];
      if (top.ch !== CLOSE[ch]) {
        return makeIssue(fileId, path, name, "css", content, top.line, top.col, `Mismatched bracket: opened '${top.ch}' here, but found '${ch}' (expected '${invertBracket(top.ch)}')`);
      }
      stack.pop();
      col++;
      continue;
    }
    col++;
  }

  if (inStr) {
    return makeIssue(fileId, path, name, "css", content, strStartLine, strStartCol, `Unterminated string literal — the ${inStr}-quoted string starting here was never closed`);
  }
  if (stack.length > 0) {
    const top = stack[stack.length - 1];
    const closer = invertBracket(top.ch);
    return makeIssue(fileId, path, name, "css", content, top.line, top.col, `Unclosed '${top.ch}' — missing closing '${closer}'`);
  }
  return null;
}

function invertBracket(open: string): string {
  return open === "{" ? "}" : open === "(" ? ")" : "]";
}

// ============================ HTML ============================
function stripHtmlComments(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<!DOCTYPE[^>]*>/gi, "")
    .replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, "");
}

/** Remove inner content of <script>/<style> so its `<`/`>` don't confuse the tag scanner. */
function hollowScriptStyle(html: string): string {
  return html
    .replace(/(<script\b[^>]*>)([\s\S]*?)(<\/script>)/gi, (_m, open: string, _body: string, close: string) => `${open}${close}`)
    .replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi, (_m, open: string, _body: string, close: string) => `${open}${close}`);
}

function checkHtmlStructure(
  fileId: string,
  path: string,
  name: string,
  rawContent: string,
): SyntaxIssue[] {
  const issues: SyntaxIssue[] = [];
  // Tokenize at character level so we can detect:
  //  - unterminated attribute values (missing closing quote)
  //  - unterminated tags (missing closing `>`)
  //  - attribute values appearing without a preceding `=`
  // Comments/DOCTYPE/CDATA are removed first so their `<`/`>`/quotes don't
  // confuse the scanner. <script>/<style> bodies are hollowed so their inner
  // `<`/`>` (e.g. `if (x < y)`) don't look like tags.
  const src = hollowScriptStyle(stripHtmlComments(rawContent));
  const len = src.length;
  const stack: { tag: string; line: number; col: number }[] = [];
  // A fatal tokenization error (unterminated string/tag) invalidates the rest
  // of the file — report it and stop, instead of emitting cascading noise.
  let fatal = false;

  let i = 0;
  // line/col are derived from `i` via lineColAt() on demand — we don't track
  // them incrementally because nothing reads them between advances.

  const advance = (n = 1) => {
    for (let k = 0; k < n && i < len; k++) i++;
  };
  const at = () => lineColAt(src, i);

  // Skip whitespace, return true if anything was skipped.
  const skipWs = (): boolean => {
    let any = false;
    while (i < len && /[ \t\r\n\f]/.test(src[i])) {
      advance();
      any = true;
    }
    return any;
  };

  // Read an attribute name (letters/digits/-/_/:/.). Returns the name or "".
  const readAttrName = (): string => {
    const start = i;
    while (i < len && /[A-Za-z0-9_\-:.\u00b7]/.test(src[i])) advance();
    return src.slice(start, i);
  };

  while (i < len && !fatal) {
    const ch = src[i];

    // Text content — skip until next `<`.
    if (ch !== "<") {
      advance();
      continue;
    }

    // We're at a `<`. Record position.
    const tagStart = at();

    // `<!--` would be a comment, but comments are already stripped.
    // `<!` — declaration (already stripped DOCTYPE/CDATA); skip to `>`.
    if (src[i + 1] === "!") {
      while (i < len && src[i] !== ">") advance();
      if (i < len) advance(); // consume `>`
      continue;
    }

    // `</` — closing tag.
    if (src[i + 1] === "/") {
      advance(2); // consume `</`
      skipWs();
      const nameStart = i;
      while (i < len && /[A-Za-z0-9\-]/.test(src[i])) advance();
      const tag = src.slice(nameStart, i).toLowerCase();
      skipWs();
      if (i >= len) {
        issues.push(makeIssue(fileId, path, name, "html", rawContent, tagStart.line, tagStart.col, `Unterminated closing tag — missing '>' to close '</${tag || "..."}'`));
        break;
      }
      if (src[i] !== ">") {
        // stray character inside closing tag — skip to `>` or EOF
        const bad = at();
        while (i < len && src[i] !== ">") advance();
        if (i >= len) {
          issues.push(makeIssue(fileId, path, name, "html", rawContent, bad.line, bad.col, `Unexpected '${src[bad.col - 1] ?? ""}' in closing tag '</${tag}>' — expected '>'`));
          break;
        }
        // fall through to consume `>`
      }
      advance(); // consume `>`

      if (!tag) continue;
      if (VOID_TAGS.has(tag)) continue; // </br> etc. harmless
      const top = stack[stack.length - 1];
      if (!top) {
        issues.push(makeIssue(fileId, path, name, "html", rawContent, tagStart.line, tagStart.col, `Unexpected closing tag </${tag}> — no matching open tag`));
        continue;
      }
      if (top.tag !== tag) {
        issues.push(makeIssue(fileId, path, name, "html", rawContent, top.line, top.col, `Unclosed <${top.tag}> (expected </${top.tag}>, but found </${tag}>)`));
        stack.pop();
        continue;
      }
      stack.pop();
      continue;
    }

    // Opening tag — `<` followed by a letter.
    if (/[A-Za-z]/.test(src[i + 1] ?? "")) {
      advance(); // consume `<`
      const nameStart = i;
      while (i < len && /[A-Za-z0-9\-]/.test(src[i])) advance();
      const tag = src.slice(nameStart, i).toLowerCase();

      // Parse attributes until we hit `>` (or `/>`) or EOF.
      let selfClosed = false;
      let closedTag = false;
      while (i < len) {
        skipWs();
        if (i >= len) break;
        const c = src[i];

        if (c === ">") {
          advance();
          closedTag = true;
          break;
        }
        if (c === "/") {
          // could be self-close `/>`
          if (src[i + 1] === ">") {
            advance(2);
            selfClosed = true;
            closedTag = true;
            break;
          }
          // stray `/` — skip it
          advance();
          continue;
        }

        // Attribute name
        const attrName = readAttrName();
        if (!attrName) {
          // stray character in tag (e.g. a stray quote). Report and skip.
          const bad = at();
          issues.push(makeIssue(fileId, path, name, "html", rawContent, bad.line, bad.col, `Unexpected '${src[i]}' inside <${tag}> tag — attribute name expected`));
          advance();
          continue;
        }

        skipWs();
        if (i >= len) break;
        if (src[i] !== "=") {
          // boolean attribute (no value) — fine, continue to next attr
          continue;
        }

        // `=` — consume, then expect a value
        advance(); // consume `=`
        skipWs();
        if (i >= len) {
          issues.push(makeIssue(fileId, path, name, "html", rawContent, at().line, at().col, `Unterminated attribute '${attrName}=' in <${tag}> — expected a value but reached end of file`));
          closedTag = true; // suppress cascading "Unterminated <tag>" report
          fatal = true;
          break;
        }
        const vc = src[i];
        if (vc === '"' || vc === "'") {
          // Quoted value — find the matching close quote.
          const quoteStart = at();
          const valueStartOff = i + 1;
          advance(); // consume opening quote
          let closed = false;
          while (i < len) {
            if (src[i] === vc) {
              advance();
              closed = true;
              break;
            }
            advance();
          }
          if (!closed) {
            const rawValue = src.slice(valueStartOff, i).replace(/\s+/g, " ").slice(-60);
            issues.push(makeIssue(fileId, path, name, "html", rawContent, quoteStart.line, quoteStart.col, `Unterminated attribute value — missing closing ${vc} after ${attrName}="${rawValue}" in <${tag}>. The string started on this line was never closed.`));
            // Mark the tag as "closed" so we don't also emit a cascading
            // "Unterminated <tag>" error — the root cause is the missing quote.
            closedTag = true;
            fatal = true;
            break;
          }
          continue;
        } else {
          // Unquoted value — read until whitespace, `>`, or a character that
          // is forbidden in unquoted attribute values per the HTML spec
          // (`"`, `'`, `` ` ``, `<`, `=`, `>`). A stray quote here means the
          // user forgot to quote the value (e.g. `href=style.css"`) — report
          // it instead of silently swallowing the quote into the value.
          const valueStart = at();
          const valueStartOff = i;
          let bad: string | null = null;
          while (i < len) {
            const c = src[i];
            if (/[ \t\r\n\f]/.test(c) || c === ">") break;
            if (c === '"' || c === "'" || c === "`" || c === "<" || c === "=") {
              bad = c;
              break;
            }
            advance();
          }
          if (bad !== null) {
            issues.push(
              makeIssue(
                fileId, path, name, "html", rawContent,
                valueStart.line, valueStart.col,
                `Unquoted attribute value contains '${bad}' — unquoted values cannot contain quotes, backticks, '<', or '='. Wrap the value in quotes: ${attrName}="${src.slice(valueStartOff, i)}"`,
              ),
            );
            // Don't consume the offending char; let the attr loop re-parse it
            // (a stray `"` will trigger the "attribute name expected" path,
            // a `>` will close the tag). Fatal to avoid cascade noise.
            fatal = true;
            closedTag = true;
            break;
          }
          continue;
        }
      }

      if (!closedTag) {
        issues.push(makeIssue(fileId, path, name, "html", rawContent, tagStart.line, tagStart.col, `Unterminated <${tag}> tag — missing closing '>'`));
        // Fatal: don't push onto the stack and don't keep scanning — the rest
        // of the file is unreliable once a tag is left open at EOF.
        fatal = true;
        continue;
      }

      if (selfClosed || VOID_TAGS.has(tag)) continue;
      stack.push({ tag, line: tagStart.line, col: tagStart.col });
      continue;
    }

    // `<` not followed by `/`, `!`, or a letter — treat as text.
    advance();
  }

  // Only report unclosed-opener errors if we didn't hit a fatal error earlier
  // (a fatal error invalidates the stack balance — those "unclosed" tags are
  // almost always collateral damage, not independent bugs).
  if (!fatal) {
    for (const s of stack) {
      issues.push(makeIssue(fileId, path, name, "html", rawContent, s.line, s.col, `Unclosed <${s.tag}> — missing </${s.tag}>`));
    }
  }
  return issues;
}

/** Extract inline <script> (no src) and <style> blocks and check them with the JS/CSS checkers. */
function checkHtmlInline(
  fileId: string,
  path: string,
  name: string,
  rawContent: string,
): SyntaxIssue[] {
  const issues: SyntaxIssue[] = [];
  // inline <style>
  const styleRe = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  let sm: RegExpExecArray | null;
  while ((sm = styleRe.exec(rawContent)) !== null) {
    const innerStart = sm.index + sm[0].indexOf(">") + 1;
    const inner = sm[1] ?? "";
    if (!inner.trim()) continue;
    const startLine = lineColAt(rawContent, innerStart).line;
    const iss = checkCSS(fileId, path, name, inner);
    if (iss) {
      issues.push({ ...iss, line: iss.line + startLine - 1, snippet: buildInlineSnippet(rawContent, iss.line + startLine - 1, iss.column) });
    }
  }
  // inline <script> without src
  const scriptRe = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let jm: RegExpExecArray | null;
  while ((jm = scriptRe.exec(rawContent)) !== null) {
    const attrs = jm[1] ?? "";
    if (/\bsrc\s*=/.test(attrs)) continue;
    const innerStart = jm.index + jm[0].indexOf(">") + 1;
    const inner = jm[2] ?? "";
    if (!inner.trim()) continue;
    const startLine = lineColAt(rawContent, innerStart).line;
    const iss = checkJavaScript(fileId, path, name, inner);
    if (iss) {
      issues.push({ ...iss, line: iss.line + startLine - 1, snippet: buildInlineSnippet(rawContent, iss.line + startLine - 1, iss.column) });
    }
  }
  return issues;
}

function buildInlineSnippet(content: string, line: number, column: number, radius = 2): string {
  return buildSnippet(content, line, column, radius);
}

// ============================ Driver ============================
function flatten(nodes: FileNode[], prefix: string, acc: { node: FileNode; path: string }[]) {
  for (const n of nodes) {
    const p = prefix ? `${prefix}/${n.name}` : n.name;
    if (n.type === "file") acc.push({ node: n, path: p });
    if (n.children) flatten(n.children, p, acc);
  }
}

export function scanProject(tree: FileNode[]): ScanResult {
  const files: { node: FileNode; path: string }[] = [];
  flatten(tree, "", files);

  const issues: SyntaxIssue[] = [];
  let checked = 0;

  for (const { node, path } of files) {
    const lang = langFor(node.name);
    if (!lang) continue;
    const content = node.content ?? "";
    if (!content.trim()) continue;
    checked++;

    if (lang === "javascript") {
      const iss = checkJavaScript(node.id, path, node.name, content);
      if (iss) issues.push(iss);
    } else if (lang === "css") {
      const iss = checkCSS(node.id, path, node.name, content);
      if (iss) issues.push(iss);
    } else if (lang === "html") {
      issues.push(...checkHtmlStructure(node.id, path, node.name, content));
      issues.push(...checkHtmlInline(node.id, path, node.name, content));
    }
  }

  return { issues, fileCount: files.length, checkedCount: checked };
}