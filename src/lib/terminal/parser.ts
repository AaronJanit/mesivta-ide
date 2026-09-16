/**
 * Parse a command-line string into structured components.
 * Supports quoted strings and basic output redirection (>).
 */
export interface ParsedCommand {
  command: string;
  args: string[];
  redirectTo: string | null; // file path after ">"
  raw: string;
}

export function parseCommand(input: string): ParsedCommand {
  const trimmed = input.trim();
  if (!trimmed) {
    return { command: "", args: [], redirectTo: null, raw: input };
  }

  // Tokenize respecting quoted strings
  const tokens: string[] = [];
  let current = "";
  let inQuote: string | null = null;

  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (inQuote) {
      if (ch === inQuote) {
        inQuote = null;
      } else {
        current += ch;
      }
    } else if (ch === '"' || ch === "'") {
      inQuote = ch;
    } else if (ch === " " || ch === "\t") {
      if (current) {
        tokens.push(current);
        current = "";
      }
    } else {
      current += ch;
    }
  }
  if (current) tokens.push(current);

  // Separate redirect target
  let redirectTo: string | null = null;
  const cleanTokens: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i] === ">" && i + 1 < tokens.length) {
      redirectTo = tokens[i + 1];
      i++; // skip the redirect target
    } else if (tokens[i].startsWith(">")) {
      // Handle >file (no space)
      redirectTo = tokens[i].slice(1) || tokens[i + 1];
      if (tokens[i].startsWith(">") && tokens[i].length === 1) {
        i++; // skip next token as redirect target
      }
    } else {
      cleanTokens.push(tokens[i]);
    }
  }

  const [command, ...args] = cleanTokens;
  return {
    command: command ?? "",
    args,
    redirectTo,
    raw: input,
  };
}