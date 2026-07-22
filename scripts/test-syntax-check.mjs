import { scanProject } from "../src/lib/debug/syntaxCheck.ts";

function mk(name, content) {
  return { id: name, project_id: "p", parent_folder_id: null, name, type: "file", content, created_at: "", updated_at: "" };
}

const cases = [
  {
    label: "missing closing quote on href",
    tree: [mk("index.html", '<!DOCTYPE html>\n<html>\n<head>\n  <link rel="styleshehet" href="style.css\n</head>\n<body></body>\n</html>')],
    expect: /Unterminated attribute value/,
  },
  {
    label: "missing closing quote on rel",
    tree: [mk("index.html", '<link rel="stylesheet href="x.css">')],
    expect: /Unterminated attribute value|Unexpected.*inside <link>|attribute name expected/,
  },
  {
    label: "missing > on tag",
    tree: [mk("index.html", '<link rel="stylesheet" href="x.css"')],
    expect: /Unterminated <link>|missing closing '>/,
  },
  {
    label: "unterminated closing tag",
    tree: [mk("index.html", '<p>hello</p')],
    expect: /Unterminated closing tag/,
  },
  {
    label: "mismatched closing tag",
    tree: [mk("index.html", '<div><span>hi</div>')],
    expect: /Unclosed <span>|expected <\/span>/,
  },
  {
    label: "css unterminated string",
    tree: [mk("style.css", 'body { content: "hello; }\n')],
    expect: /Unterminated string/,
  },
  {
    label: "css unclosed brace",
    tree: [mk("style.css", "body { color: red;\n")],
    expect: /Unclosed '{'|missing closing '}'/,
  },
  {
    label: "css mismatched paren",
    tree: [mk("style.css", "@media (min-width: 600px {\n  a {}\n}\n")],
    expect: /Mismatched bracket|missing closing '\)'/,
  },
  {
    label: "js missing semicolon is NOT a syntax error (valid)",
    tree: [mk("a.js", "let x = 1\nlet y = 2\n")],
    expect: null,
  },
  {
    label: "js real syntax error",
    tree: [mk("a.js", "function f({\n")],
    expect: /SyntaxError|Unexpected|expected/i,
  },
  {
    label: "valid html with quoted attrs",
    tree: [mk("index.html", '<!DOCTYPE html><html><head><link rel="stylesheet" href="x.css"></head><body><p class="a">hi</p></body></html>')],
    expect: null,
  },
  {
    label: "user's exact case: link rel=styleshehet href=style.css (missing closing quote)",
    tree: [mk("index.html", '<!DOCTYPE html>\n<html>\n<head>\n  <link rel="styleshehet" href="style.css\n</head>\n<body></body>\n</html>')],
    expect: /Unterminated attribute value.*missing closing " after href/,
    expectCount: 1, // fatal-bail should suppress cascading unclosed-tag noise
  },
];

let pass = 0;
let fail = 0;
for (const c of cases) {
  const r = scanProject(c.tree);
  const msgs = r.issues.map((i) => i.message);
  const matched = c.expect ? msgs.some((m) => c.expect.test(m)) : msgs.length === 0;
  const countOk = c.expectCount === undefined || r.issues.length === c.expectCount;
  if (matched && countOk) {
    console.log(`PASS  ${c.label}`);
    pass++;
  } else {
    console.error(`FAIL  ${c.label}`);
    console.error("      expected:", c.expect ? c.expect.toString() : "(no issues)", c.expectCount ? `, count=${c.expectCount}` : "");
    console.error("      got:", JSON.stringify(msgs));
    fail++;
  }
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);