// Structured lesson content for the Coding Guide.
// Each lesson is a self-contained, beginner-friendly explanation + code +
// optional live preview + beginner mistakes + tips.
//
// Previews are rendered inside a sandboxed <iframe srcDoc>. They must be a
// complete HTML document so the iframe can render them standalone.

export type GuideLanguage = "html" | "css" | "javascript";

export interface Lesson {
  id: string;
  title: string;
  language: GuideLanguage;
  /** One-sentence plain-English summary shown under the heading. */
  summary: string;
  /** Short, digestible paragraphs. Keep each under ~2 sentences. */
  explanation: string[];
  /** The example code shown in the syntax-highlighted block. */
  code: string;
  /** Complete HTML document for the iframe preview. Omit for no preview. */
  previewHtml?: string;
  mistakes?: string[];
  tips?: string[];
}

export interface GuideSection {
  id: string;
  title: string;
  /** lucide-react icon name (resolved in CodingGuide via the icon map). */
  icon: string;
  blurb: string;
  lessons: Lesson[];
}

export const GUIDE_SECTIONS: GuideSection[] = [
  // ============================================================
  // HTML BASICS
  // ============================================================
  {
    id: "html",
    title: "HTML Basics",
    icon: "FileCode",
    blurb: "HTML is the skeleton of every web page. It tells the browser what appears on the page — text, images, buttons, and more.",
    lessons: [
      {
        id: "html-structure",
        title: "Page Structure",
        language: "html",
        summary: "Every HTML page starts with the same boilerplate that tells the browser it’s reading HTML.",
        explanation: [
          "An HTML page is a text file with tags wrapped in angle brackets, like <html>. The browser reads these tags top to bottom and draws the page.",
          "The <!DOCTYPE html> line must be the very first thing — it tells the browser to use modern HTML5 rules.",
          "<head> holds information about the page (title, character set). <body> holds everything the visitor actually sees.",
        ],
        code: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>My First Page</title>
  </head>
  <body>
    <h1>Hello, world!</h1>
    <p>This is my first web page.</p>
  </body>
</html>`,
        previewHtml: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>My First Page</title>
    <style>
      body { font-family: system-ui, sans-serif; padding: 24px; color: #111; }
    </style>
  </head>
  <body>
    <h1>Hello, world!</h1>
    <p>This is my first web page.</p>
  </body>
</html>`,
        mistakes: [
          "Forgetting <!DOCTYPE html> — older rendering rules kick in and layouts behave oddly.",
          "Putting visible content inside <head> — it won’t show up.",
          "Missing the closing </html> tag.",
        ],
        tips: [
          "Always set <meta charset=\"UTF-8\"> so symbols and emojis display correctly.",
          "Indent nested tags — it makes the structure easier to read.",
        ],
      },
      {
        id: "html-headings",
        title: "Headings",
        language: "html",
        summary: "Headings create titles and subtitles. There are six levels, from <h1> (biggest) to <h6> (smallest).",
        explanation: [
          "Use <h1> once per page for the main title. Use <h2> through <h6> for subsections, in order.",
          "Headings aren’t just about size — search engines and screen readers use them to understand your page structure.",
        ],
        code: `<h1>Main Page Title</h1>
<h2>A Section</h2>
<h3>A Subsection</h3>
<h4>A Smaller Heading</h4>`,
        previewHtml: `<!DOCTYPE html><html><body style="font-family:system-ui;padding:24px;">
<h1>Main Page Title</h1>
<h2>A Section</h2>
<h3>A Subsection</h3>
<h4>A Smaller Heading</h4>
</body></html>`,
        mistakes: [
          "Using headings only to make text bigger — use CSS for size, headings for structure.",
          "Skipping levels (e.g. <h1> then <h4>) — confuses screen readers.",
        ],
        tips: [
          "Have exactly one <h1> per page.",
          "Keep heading text short and descriptive.",
        ],
      },
      {
        id: "html-paragraphs",
        title: "Paragraphs",
        language: "html",
        summary: "The <p> tag holds a block of text. The browser adds space above and below it automatically.",
        explanation: [
          "Any normal text on a web page belongs in a <p> tag.",
          "Browsers ignore extra spaces and line breaks inside a <p> — use <br> for a manual line break.",
        ],
        code: `<p>This is a paragraph of text. The browser
will collapse extra     spaces and ignore
line breaks inside it.</p>

<p>This is a second paragraph.</p>`,
        previewHtml: `<!DOCTYPE html><html><body style="font-family:system-ui;padding:24px;color:#111;">
<p>This is a paragraph of text. The browser will collapse extra spaces and ignore line breaks inside it.</p>
<p>This is a second paragraph.</p>
</body></html>`,
        mistakes: [
          "Putting multiple paragraphs inside one <p> — use separate <p> tags.",
          "Pressing Enter to create line breaks — HTML ignores them. Use <br>.",
        ],
        tips: ["Keep paragraphs short for easier reading on screens."],
      },
      {
        id: "html-links",
        title: "Links",
        language: "html",
        summary: "The <a> (anchor) tag turns text into a clickable link. The href attribute sets the destination URL.",
        explanation: [
          "Wrap text (or an image) in an <a> tag and add href=\"...\" to choose where it goes.",
          "Add target=\"_blank\" to open the link in a new tab.",
        ],
        code: `<a href="https://example.com">Visit Example</a>

<!-- Opens in a new tab -->
<a href="https://example.com" target="_blank">
  Open in new tab
</a>`,
        previewHtml: `<!DOCTYPE html><html><body style="font-family:system-ui;padding:24px;color:#111;">
<p><a href="https://example.com">Visit Example</a></p>
<p><a href="https://example.com" target="_blank">Open in new tab</a></p>
</body></html>`,
        mistakes: [
          "Forgetting the href attribute — the text won’t be clickable.",
          "Forgetting the closing </a> — the rest of the page becomes part of the link.",
        ],
        tips: [
          "Use rel=\"noopener noreferrer\" with target=\"_blank\" for security on external links.",
          "Link text should describe the destination — avoid “click here”.",
        ],
      },
      {
        id: "html-images",
        title: "Images",
        language: "html",
        summary: "The <img> tag shows a picture. The src attribute points to the image file and alt describes it in words.",
        explanation: [
          "Images are self-closing — no </img> needed.",
          "alt text shows if the image fails to load and is read aloud by screen readers, so always include it.",
        ],
        code: `<img
  src="https://picsum.photos/200/120"
  alt="A random placeholder photo"
  width="200"
  height="120"
/>`,
        previewHtml: `<!DOCTYPE html><html><body style="font-family:system-ui;padding:24px;color:#111;">
<img src="https://picsum.photos/200/120" alt="A random placeholder photo" width="200" height="120" />
</body></html>`,
        mistakes: [
          "Leaving out alt — bad for accessibility and SEO.",
          "Using huge images without width/height — the page jumps while loading.",
        ],
        tips: ["Use descriptive alt text like “Golden retriever playing fetch”, not just “dog”."],
      },
      {
        id: "html-buttons",
        title: "Buttons",
        language: "html",
        summary: "The <button> tag creates a clickable button. You usually wire it up with JavaScript later.",
        explanation: [
          "Buttons can contain text or icons. Type anything between <button> and </button> becomes the label.",
          "Use type=\"button\" if the button isn’t submitting a form, to avoid surprises.",
        ],
        code: `<button type="button">Click me</button>

<button type="button" disabled>Disabled</button>`,
        previewHtml: `<!DOCTYPE html><html><body style="font-family:system-ui;padding:24px;color:#111;">
<button type="button" onclick="alert('Hi!')">Click me</button>
<button type="button" disabled>Disabled</button>
</body></html>`,
        mistakes: [
          "Using <div> with an onclick instead of a <button> — divs aren’t keyboard-accessible.",
          "Forgetting type=\"button\" inside a form — the button may accidentally submit it.",
        ],
        tips: ["Buttons respond to Enter and Space automatically — divs do not."],
      },
      {
        id: "html-lists",
        title: "Lists",
        language: "html",
        summary: "Use <ul> for bullet lists and <ol> for numbered lists. Each item goes in an <li>.",
        explanation: [
          "<ul> = unordered list (bullets). <ol> = ordered list (numbers).",
          "Every item must be wrapped in <li>...</li>.",
        ],
        code: `<ul>
  <li>Apples</li>
  <li>Bananas</li>
  <li>Cherries</li>
</ul>

<ol>
  <li>Wake up</li>
  <li>Brush teeth</li>
  <li>Eat breakfast</li>
</ol>`,
        previewHtml: `<!DOCTYPE html><html><body style="font-family:system-ui;padding:24px;color:#111;">
<ul><li>Apples</li><li>Bananas</li><li>Cherries</li></ul>
<ol><li>Wake up</li><li>Brush teeth</li><li>Eat breakfast</li></ol>
</body></html>`,
        mistakes: [
          "Putting text directly inside <ul> without <li> — invalid HTML.",
          "Mixing <ul> and <ol> items in the same list.",
        ],
        tips: ["You can nest lists by putting a <ul> inside an <li>."],
      },
      {
        id: "html-tables",
        title: "Tables",
        language: "html",
        summary: "Tables show rows and columns of data. Use <tr> for rows, <th> for headers, <td> for cells.",
        explanation: [
          "A table is built row by row. Each <tr> is a row, each <td> inside it is a cell.",
          "Use <th> for header cells — they’re bold and centered by default.",
        ],
        code: `<table>
  <tr>
    <th>Name</th>
    <th>Age</th>
  </tr>
  <tr>
    <td>Alice</td>
    <td>30</td>
  </tr>
  <tr>
    <td>Bob</td>
    <td>25</td>
  </tr>
</table>`,
        previewHtml: `<!DOCTYPE html><html><body style="font-family:system-ui;padding:24px;color:#111;">
<table border="1" cellpadding="6" style="border-collapse:collapse;">
<tr><th>Name</th><th>Age</th></tr>
<tr><td>Alice</td><td>30</td></tr>
<tr><td>Bob</td><td>25</td></tr>
</table>
</body></html>`,
        mistakes: [
          "Using tables for page layout — use CSS Flexbox or Grid instead.",
          "Having a different number of cells per row — columns won’t line up.",
        ],
        tips: ["Add <thead>, <tbody>, and <tfoot> for big tables to group rows logically."],
      },
      {
        id: "html-forms",
        title: "Forms",
        language: "html",
        summary: "Forms collect user input. Inside a <form> you place inputs like text boxes, checkboxes, and a submit button.",
        explanation: [
          "Each input needs a name so the server can identify the data.",
          "Labels matter: pair a <label> with an input using for=\"inputId\" so clicking the label focuses the input.",
        ],
        code: `<form>
  <label for="name">Name:</label>
  <input id="name" name="name" type="text" />

  <label for="email">Email:</label>
  <input id="email" name="email" type="email" />

  <button type="submit">Send</button>
</form>`,
        previewHtml: `<!DOCTYPE html><html><body style="font-family:system-ui;padding:24px;color:#111;">
<form onsubmit="event.preventDefault(); alert('Submitted!')">
  <p><label for="name">Name:</label><br>
  <input id="name" name="name" type="text"></p>
  <p><label for="email">Email:</label><br>
  <input id="email" name="email" type="email"></p>
  <button type="submit">Send</button>
</form>
</body></html>`,
        mistakes: [
          "Forgetting the name attribute — the input’s value won’t be sent.",
          "Not pairing <label for> with <input id> — clicking the label won’t focus the field.",
        ],
        tips: ["Use the right input type (email, number, date) — phones show the right keyboard automatically."],
      },
      {
        id: "html-semantic",
        title: "Semantic Elements",
        language: "html",
        summary: "Semantic tags like <header>, <nav>, <main>, and <footer> describe what a section is, not just how it looks.",
        explanation: [
          "Instead of <div> everywhere, use tags that describe meaning: <header>, <nav>, <main>, <article>, <section>, <footer>.",
          "They make your code easier to read and help screen readers navigate the page.",
        ],
        code: `<header>
  <h1>My Site</h1>
  <nav>
    <a href="/">Home</a>
    <a href="/about">About</a>
  </nav>
</header>

<main>
  <article>
    <h2>Blog Post Title</h2>
    <p>Post content goes here…</p>
  </article>
</main>

<footer>
  <p>© 2026 My Site</p>
</footer>`,
        previewHtml: `<!DOCTYPE html><html><body style="font-family:system-ui;padding:24px;color:#111;">
<header style="border-bottom:1px solid #ccc;padding-bottom:8px;">
  <h1 style="margin:0;">My Site</h1>
  <nav><a href="#">Home</a> | <a href="#">About</a></nav>
</header>
<main style="padding:12px 0;">
  <article><h2>Blog Post Title</h2><p>Post content goes here…</p></article>
</main>
<footer style="border-top:1px solid #ccc;padding-top:8px;color:#666;">
  <p>© 2026 My Site</p>
</footer>
</body></html>`,
        mistakes: [
          "Using <div class=\"header\"> instead of <header> — you lose the semantic meaning.",
          "Wrapping the whole page in <section> — use <main> for the primary content.",
        ],
        tips: ["Semantic tags behave like <div> by default — add CSS for layout, keep the meaning."],
      },
    ],
  },

  // ============================================================
  // CSS BASICS
  // ============================================================
  {
    id: "css",
    title: "CSS Basics",
    icon: "Palette",
    blurb: "CSS controls how HTML looks — colors, fonts, spacing, and layout. A rule is: selector { property: value; }.",
    lessons: [
      {
        id: "css-colors",
        title: "Colors",
        language: "css",
        summary: "Use the color and background-color properties to set text and background colors.",
        explanation: [
          "color sets the text color. background-color sets the background.",
          "Colors can be names (red), hex (#ff0000), or rgb (rgb(255,0,0)).",
        ],
        code: `body {
  color: #333333;
  background-color: #f0f8ff;
}

.highlight {
  color: white;
  background-color: #0088ff;
}`,
        previewHtml: `<!DOCTYPE html><html><head><style>
body { color: #333333; background-color: #f0f8ff; font-family: system-ui; padding: 24px; }
.highlight { color: white; background-color: #0088ff; padding: 2px 6px; border-radius: 4px; }
</style></head><body>
<p>Normal text on a light blue background.</p>
<p>This has a <span class="highlight">blue highlight</span> inside it.</p>
</body></html>`,
        mistakes: [
          "Forgetting the # in hex colors — “ff0000” without # won’t work.",
          "Setting color and background-color to similar shades — text becomes unreadable.",
        ],
        tips: ["Use rgba(0,0,0,0.5) when you need a semi-transparent color."],
      },
      {
        id: "css-fonts",
        title: "Fonts",
        language: "css",
        summary: "font-family chooses the typeface, font-size sets the size, font-weight makes text bold.",
        explanation: [
          "font-family takes a list of fallback fonts. The browser uses the first one available.",
          "font-size accepts px, rem, em, or %.",
        ],
        code: `body {
  font-family: "Helvetica Neue", Arial, sans-serif;
  font-size: 16px;
  font-weight: 400;
}

h1 {
  font-size: 2rem;
  font-weight: 700;
}`,
        previewHtml: `<!DOCTYPE html><html><head><style>
body { font-family: "Helvetica Neue", Arial, sans-serif; font-size: 16px; padding: 24px; color: #111; }
h1 { font-size: 2rem; font-weight: 700; }
.small { font-size: 12px; color: #666; }
</style></head><body>
<h1>A Big Heading</h1>
<p>Body text at 16px.</p>
<p class="small">Smaller, muted text.</p>
</body></html>`,
        mistakes: [
          "Listing only one fancy font that isn’t installed — text falls back to default.",
          "Using font-size in px everywhere — rem scales better with user settings.",
        ],
        tips: ["Always end a font-family list with a generic name like sans-serif or serif."],
      },
      {
        id: "css-box-model",
        title: "Padding & Margins",
        language: "css",
        summary: "padding is space inside an element (between content and border). margin is space outside (between elements).",
        explanation: [
          "Every element is a box. padding pushes content inward; margin pushes the box away from neighbors.",
          "Shorthand: padding: 10px 20px; = top/bottom 10px, left/right 20px. Same pattern for margin.",
        ],
        code: `.card {
  padding: 16px;
  margin: 24px 0;
  background: #eee;
}`,
        previewHtml: `<!DOCTYPE html><html><head><style>
body { font-family: system-ui; padding: 24px; }
.box { background: #ffd; border: 1px dashed #aa0; padding: 16px; margin: 24px 0; }
.gap { background: #fdd; border: 1px dashed #a00; padding: 8px; }
</style></head><body>
<div class="box">Yellow box has 16px padding inside and 24px margin above/below.</div>
<div class="gap">Red box shows the margin gap above.</div>
</body></html>`,
        mistakes: [
          "Using margin when you wanted padding — content sits touching the edge.",
          "Forgetting that margins between two stacked elements collapse (only the larger one applies).",
        ],
        tips: ["Use padding to make a button bigger without changing its outer spacing."],
      },
      {
        id: "css-borders",
        title: "Borders",
        language: "css",
        summary: "border draws a line around an element. Set its width, style, and color together.",
        explanation: [
          "border: 2px solid red; is shorthand for width, style, and color.",
          "border-radius rounds the corners.",
        ],
        code: `.box {
  border: 2px solid #0088ff;
  border-radius: 8px;
  padding: 12px;
}`,
        previewHtml: `<!DOCTYPE html><html><head><style>
body { font-family: system-ui; padding: 24px; }
.box { border: 2px solid #0088ff; border-radius: 8px; padding: 12px; color: #111; }
.pill { border: 2px dashed #888; border-radius: 999px; padding: 8px 16px; margin-top: 12px; }
</style></head><body>
<div class="box">A box with a rounded blue border.</div>
<div class="pill">A pill-shaped dashed border.</div>
</body></html>`,
        mistakes: [
          "Writing border: red; — you must include a style like solid or dashed.",
          "Forgetting border-radius units — border-radius: 8 (no px) is invalid.",
        ],
        tips: ["Use border-radius: 999px to make fully rounded pill shapes."],
      },
      {
        id: "css-display",
        title: "Display",
        language: "css",
        summary: "The display property decides how an element sits on the page. The big three: block, inline, and none.",
        explanation: [
          "block elements take a full row (div, p, h1). inline elements sit in a line (span, a).",
          "display: none hides an element completely — it takes up no space.",
        ],
        code: `span {
  display: block; /* now behaves like a full-width block */
}

.hidden {
  display: none; /* removed from the page entirely */
}`,
        previewHtml: `<!DOCTYPE html><html><head><style>
body { font-family: system-ui; padding: 24px; color: #111; }
.inline-demo span { background: #eef; padding: 2px 4px; }
.block-demo span { display: block; background: #efe; padding: 2px 4px; margin: 2px 0; }
.hidden { display: none; }
</style></head><body>
<p class="inline-demo">Inline: <span>one</span> <span>two</span> <span>three</span></p>
<p class="block-demo">Block: <span>one</span><span>two</span><span>three</span></p>
<p class="hidden">You can’t see me.</p>
<p>After the hidden one.</p>
</body></html>`,
        mistakes: [
          "Setting width on an inline element — it’s ignored. Use display: block or inline-block first.",
          "Using visibility: hidden when you wanted display: none — visibility still takes up space.",
        ],
        tips: ["display: inline-block gives an element block-like sizing while staying inline."],
      },
      {
        id: "css-flexbox",
        title: "Flexbox",
        language: "css",
        summary: "Flexbox arranges items in a row or column and aligns them with little code. Add display: flex to the container.",
        explanation: [
          "flex-direction: row lays children left to right; column stacks them top to bottom.",
          "justify-content controls spacing along the main axis (e.g. center spreads them out).",
        ],
        code: `.row {
  display: flex;
  gap: 12px;
  justify-content: center;
  align-items: center;
}`,
        previewHtml: `<!DOCTYPE html><html><head><style>
body { font-family: system-ui; padding: 24px; }
.row { display: flex; gap: 12px; justify-content: center; align-items: center; }
.item { background: #0088ff; color: white; padding: 16px 24px; border-radius: 6px; }
</style></head><body>
<div class="row">
  <div class="item">One</div>
  <div class="item">Two</div>
  <div class="item">Three</div>
</div>
</body></html>`,
        mistakes: [
          "Adding flex to a child instead of the container — it does nothing there.",
          "Expecting items to wrap — set flex-wrap: wrap so they drop to a new line.",
        ],
        tips: ["Use gap instead of margins for spacing between flex items — it’s cleaner."],
      },
      {
        id: "css-grid",
        title: "Grid (Basic)",
        language: "css",
        summary: "CSS Grid lays items out in rows and columns like a spreadsheet. Add display: grid and define columns.",
        explanation: [
          "grid-template-columns defines how many columns and how wide each one is.",
          "1fr means “one fraction of the available space” — fr units are flexible.",
        ],
        code: `.grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12px;
}`,
        previewHtml: `<!DOCTYPE html><html><head><style>
body { font-family: system-ui; padding: 24px; }
.grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
.cell { background: #0088ff; color: white; padding: 20px; border-radius: 6px; text-align: center; }
</style></head><body>
<div class="grid">
  <div class="cell">1</div>
  <div class="cell">2</div>
  <div class="cell">3</div>
  <div class="cell">4</div>
  <div class="cell">5</div>
  <div class="cell">6</div>
</div>
</body></html>`,
        mistakes: [
          "Forgetting gap and using margins — spacing becomes uneven at the edges.",
          "Using fixed px widths that don’t fit small screens.",
        ],
        tips: ["Use repeat(3, 1fr) instead of typing 1fr three times."],
      },
      {
        id: "css-positioning",
        title: "Positioning",
        language: "css",
        summary: "position controls where an element sits. static is default; relative offsets from its normal spot; fixed sticks to the screen.",
        explanation: [
          "relative keeps the element in the flow but lets you nudge it with top, left, etc.",
          "fixed takes the element out of flow and pins it to the viewport (great for sticky headers).",
        ],
        code: `.badge {
  position: relative;
  top: -8px;
  left: 8px;
}

.header {
  position: fixed;
  top: 0;
  width: 100%;
}`,
        previewHtml: `<!DOCTYPE html><html><head><style>
body { font-family: system-ui; padding: 24px; color: #111; }
.box { position: relative; background: #eef; padding: 16px; }
.badge { position: relative; top: -8px; left: 12px; background: #0088ff; color: white; padding: 2px 8px; border-radius: 999px; }
</style></head><body>
<div class="box">
  <span class="badge">New</span>
  <p>The badge is nudged up and right using position: relative.</p>
</div>
</body></html>`,
        mistakes: [
          "Using position: absolute without a positioned parent — it floats to an unexpected place.",
          "Forgetting to add top/left values — the position property alone does nothing.",
        ],
        tips: ["Set position: relative on a parent so absolute children stay inside it."],
      },
      {
        id: "css-hover",
        title: "Hover Effects",
        language: "css",
        summary: "The :hover pseudo-class applies styles when the mouse is over an element — perfect for buttons and links.",
        explanation: [
          "Write selector:hover { ... } to change styles on hover.",
          "Add transition to make the change smooth instead of instant.",
        ],
        code: `.btn {
  background: #0088ff;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  transition: background 0.2s;
}

.btn:hover {
  background: #0066cc;
}`,
        previewHtml: `<!DOCTYPE html><html><head><style>
body { font-family: system-ui; padding: 24px; }
.btn { background: #0088ff; color: white; padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; transition: background 0.2s; }
.btn:hover { background: #0066cc; }
</style></head><body>
<button class="btn">Hover over me</button>
</body></html>`,
        mistakes: [
          "Relying on hover-only effects — they don’t work on touch devices. Always have a non-hover state.",
          "Skipping transition — the change looks abrupt.",
        ],
        tips: ["Keep hover transitions under 0.3s — longer feels laggy."],
      },
      {
        id: "css-responsive",
        title: "Responsive Design Basics",
        language: "css",
        summary: "Media queries let you apply different styles based on screen width, so your page looks good on phones and desktops.",
        explanation: [
          "@media (max-width: 600px) { ... } applies only when the screen is 600px wide or smaller.",
          "Start with a mobile layout, then add media queries to enhance for larger screens.",
        ],
        code: `.grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
}

@media (max-width: 600px) {
  .grid {
    grid-template-columns: 1fr; /* stack on phones */
  }
}`,
        previewHtml: `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>
body { font-family: system-ui; padding: 24px; }
.grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
.cell { background: #0088ff; color: white; padding: 20px; border-radius: 6px; text-align: center; }
@media (max-width: 600px) {
  .grid { grid-template-columns: 1fr; }
}
</style></head><body>
<p>Resize this preview to see the grid collapse to one column on narrow widths.</p>
<div class="grid">
  <div class="cell">1</div><div class="cell">2</div><div class="cell">3</div>
</div>
</body></html>`,
        mistakes: [
          "Forgetting <meta name=\"viewport\"> — media queries don’t fire correctly on phones.",
          "Using fixed px widths everywhere — they overflow on small screens.",
        ],
        tips: ["Prefer relative units (%, fr, rem) over px for layouts that adapt."],
      },
    ],
  },

  // ============================================================
  // JAVASCRIPT BASICS
  // ============================================================
  {
    id: "javascript",
    title: "JavaScript Basics",
    icon: "Braces",
    blurb: "JavaScript makes pages interactive. It runs in the browser and can change HTML and CSS on the fly.",
    lessons: [
      {
        id: "js-variables",
        title: "Variables",
        language: "javascript",
        summary: "Variables store values you can reuse. Use let for values that change, const for values that don’t.",
        explanation: [
          "const name = \"Alice\"; creates a variable named name that can’t be reassigned.",
          "let age = 30; creates a variable you can update later: age = 31;.",
        ],
        code: `const name = "Alice";
let age = 30;

console.log(name); // "Alice"
age = age + 1;
console.log(age);  // 31`,
        previewHtml: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body { font-family: system-ui; padding: 24px; color: #111; }
pre { background: #f4f4f4; padding: 12px; border-radius: 6px; }
</style></head><body>
<pre id="out"></pre>
<script>
const name = "Alice";
let age = 30;
let out = "name = " + name + "\\n";
age = age + 1;
out += "age = " + age;
document.getElementById("out").textContent = out;
</script>
</body></html>`,
        mistakes: [
          "Using var — it has confusing scoping rules. Use let and const instead.",
          "Reassigning a const — it throws an error.",
        ],
        tips: ["Default to const. Switch to let only when you need to reassign."],
      },
      {
        id: "js-functions",
        title: "Functions",
        language: "javascript",
        summary: "A function is a reusable block of code. Give it inputs (parameters) and it returns an output.",
        explanation: [
          "Functions package up code so you can run it multiple times with different inputs.",
          "Call a function with parentheses: greet(\"Alice\").",
        ],
        code: `function greet(name) {
  return "Hello, " + name + "!";
}

const message = greet("Alice");
console.log(message); // "Hello, Alice!"`,
        previewHtml: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body { font-family: system-ui; padding: 24px; color: #111; }
</style></head><body>
<p id="out"></p>
<script>
function greet(name) {
  return "Hello, " + name + "!";
}
document.getElementById("out").textContent = greet("Alice");
</script>
</body></html>`,
        mistakes: [
          "Forgetting return — the function returns undefined.",
          "Calling the function before defining it in a const arrow function — throws an error.",
        ],
        tips: ["Arrow functions are shorter: const greet = (name) => \"Hello, \" + name + \"!\"."],
      },
      {
        id: "js-events",
        title: "Events",
        language: "javascript",
        summary: "An event is something that happens — a click, a key press, a page load. Listen for it and run code in response.",
        explanation: [
          "addEventListener links an event to a function. When the event fires, the function runs.",
          "Common events: click, mouseover, keydown, submit, input.",
        ],
        code: `const button = document.querySelector("button");

button.addEventListener("click", () => {
  console.log("Button was clicked!");
});`,
        previewHtml: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body { font-family: system-ui; padding: 24px; color: #111; }
button { padding: 10px 16px; border: none; background: #0088ff; color: white; border-radius: 6px; cursor: pointer; }
</style></head><body>
<button>Click me</button>
<p>Clicks: <span id="count">0</span></p>
<script>
let count = 0;
const btn = document.querySelector("button");
btn.addEventListener("click", () => {
  count++;
  document.getElementById("count").textContent = count;
});
</script>
</body></html>`,
        mistakes: [
          "Selecting the element before it exists in the DOM — put the <script> at the end of <body>.",
          "Passing a function call (greet()) instead of the function (greet) — it runs immediately.",
        ],
        tips: ["Use addEventListener instead of onclick= attributes — you can attach multiple listeners."],
      },
      {
        id: "js-buttons",
        title: "Buttons",
        language: "javascript",
        summary: "Wire a button’s click event to a function to make something happen when the user presses it.",
        explanation: [
          "Select the button, then call addEventListener(\"click\", ...).",
          "Anything inside the listener function runs each time the button is clicked.",
        ],
        code: `document.querySelector("#myBtn")
  .addEventListener("click", () => {
    alert("You clicked the button!");
  });`,
        previewHtml: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body { font-family: system-ui; padding: 24px; color: #111; }
button { padding: 10px 16px; border: none; background: #0088ff; color: white; border-radius: 6px; cursor: pointer; }
</style></head><body>
<button id="myBtn">Show greeting</button>
<script>
document.querySelector("#myBtn").addEventListener("click", () => {
  alert("Hello! Thanks for clicking.");
});
</script>
</body></html>`,
        mistakes: [
          "Mismatching the selector — #myBtn means id=\"myBtn\", .myBtn means class=\"myBtn\".",
          "Forgetting the script runs before the button exists — move the script below the button.",
        ],
        tips: ["Disable a button with btn.disabled = true to prevent double clicks."],
      },
      {
        id: "js-change-text",
        title: "Changing Text",
        language: "javascript",
        summary: "Use textContent to change the text inside an HTML element from JavaScript.",
        explanation: [
          "element.textContent = \"new text\" replaces everything inside that element.",
          "innerHTML also works but can run HTML — use textContent for plain text to avoid security issues.",
        ],
        code: `const heading = document.querySelector("h1");
heading.textContent = "Updated Title";`,
        previewHtml: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body { font-family: system-ui; padding: 24px; color: #111; }
button { padding: 10px 16px; border: none; background: #0088ff; color: white; border-radius: 6px; cursor: pointer; }
</style></head><body>
<h1 id="title">Original Title</h1>
<button id="btn">Change text</button>
<script>
document.querySelector("#btn").addEventListener("click", () => {
  document.querySelector("#title").textContent = "Updated Title!";
});
</script>
</body></html>`,
        mistakes: [
          "Using innerHTML for user-provided text — it can inject scripts. Prefer textContent.",
          "Selecting a non-existent element — querySelector returns null and the next line crashes.",
        ],
        tips: ["Cache elements in a variable if you use them more than once."],
      },
      {
        id: "js-change-styles",
        title: "Changing Styles",
        language: "javascript",
        summary: "element.style.property = value changes an element’s CSS from JavaScript.",
        explanation: [
          "CSS properties with hyphens become camelCase in JS: background-color → backgroundColor.",
          "For multiple styles at once, toggle a CSS class with classList.toggle(\"className\").",
        ],
        code: `const box = document.querySelector(".box");
box.style.backgroundColor = "red";
box.style.color = "white";`,
        previewHtml: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body { font-family: system-ui; padding: 24px; color: #111; }
.box { padding: 20px; background: #eee; border-radius: 6px; }
button { margin-top: 12px; padding: 10px 16px; border: none; background: #0088ff; color: white; border-radius: 6px; cursor: pointer; }
</style></head><body>
<div class="box" id="box">Watch my color change.</div>
<button id="btn">Make it red</button>
<script>
document.querySelector("#btn").addEventListener("click", () => {
  const box = document.querySelector("#box");
  box.style.backgroundColor = "red";
  box.style.color = "white";
});
</script>
</body></html>`,
        mistakes: [
          "Writing box.style.background-color — use backgroundColor instead.",
          "Forgetting the unit — style.width = \"100\" is invalid; use \"100px\".",
        ],
        tips: ["Prefer toggling CSS classes over setting inline styles — keeps styling in CSS."],
      },
      {
        id: "js-conditionals",
        title: "Simple Conditionals",
        language: "javascript",
        summary: "if statements run code only when a condition is true. Add else for the alternative.",
        explanation: [
          "if (condition) { ... } runs the block when condition is true.",
          "Compare with === (equal) or !== (not equal). Avoid == and != — they have confusing type rules.",
        ],
        code: `const age = 18;

if (age >= 18) {
  console.log("Adult");
} else {
  console.log("Minor");
}`,
        previewHtml: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body { font-family: system-ui; padding: 24px; color: #111; }
input { padding: 6px; } button { padding: 6px 12px; }
</style></head><body>
<label>Age: <input id="age" type="number" value="18"></label>
<button id="check">Check</button>
<p id="result"></p>
<script>
document.querySelector("#check").addEventListener("click", () => {
  const age = Number(document.querySelector("#age").value);
  const result = document.querySelector("#result");
  if (age >= 18) {
    result.textContent = "Adult";
  } else {
    result.textContent = "Minor";
  }
});
</script>
</body></html>`,
        mistakes: [
          "Using = (assignment) instead of === (comparison) in conditions.",
          "Comparing strings to numbers with === — they’re never equal. Convert first.",
        ],
        tips: ["Chain multiple cases with else if."],
      },
      {
        id: "js-loops",
        title: "Loops (Basic)",
        language: "javascript",
        summary: "A loop repeats a block of code. for loops run a set number of times; while loops run until a condition is false.",
        explanation: [
          "for (let i = 0; i < 5; i++) { ... } runs 5 times — i goes 0, 1, 2, 3, 4.",
          "Use loops to process arrays or repeat work without copy-pasting code.",
        ],
        code: `for (let i = 1; i <= 5; i++) {
  console.log("Count: " + i);
}`,
        previewHtml: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body { font-family: system-ui; padding: 24px; color: #111; }
li { margin: 4px 0; }
</style></head><body>
<ul id="list"></ul>
<script>
const list = document.querySelector("#list");
for (let i = 1; i <= 5; i++) {
  const li = document.createElement("li");
  li.textContent = "Count: " + i;
  list.appendChild(li);
}
</script>
</body></html>`,
        mistakes: [
          "Starting i at 1 and using i < 5 — you only get 4 iterations.",
          "Forgetting i++ — the loop runs forever.",
        ],
        tips: ["Off-by-one errors are the most common loop bug. Double-check < vs <=."],
      },
      {
        id: "js-dom-selection",
        title: "DOM Selection",
        language: "javascript",
        summary: "querySelector finds the first element matching a CSS selector; querySelectorAll finds all of them.",
        explanation: [
          "document.querySelector(\".btn\") returns the first element with class btn.",
          "document.querySelectorAll(\"li\") returns a list of all <li> elements you can loop over.",
        ],
        code: `const button = document.querySelector(".btn");
const allItems = document.querySelectorAll("li");

allItems.forEach((item) => {
  console.log(item.textContent);
});`,
        previewHtml: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body { font-family: system-ui; padding: 24px; color: #111; }
li { margin: 4px 0; }
</style></head><body>
<ul>
  <li>Apple</li>
  <li>Banana</li>
  <li>Cherry</li>
</ul>
<button id="btn">Count items</button>
<p id="out"></p>
<script>
document.querySelector("#btn").addEventListener("click", () => {
  const items = document.querySelectorAll("li");
  document.querySelector("#out").textContent = "Found " + items.length + " items.";
});
</script>
</body></html>`,
        mistakes: [
          "Calling forEach on querySelector result — it returns a single element, not a list.",
          "Forgetting that querySelectorAll returns a NodeList, not a live array.",
        ],
        tips: ["Use getElementById for fast id lookups when you don’t need CSS selectors."],
      },
      {
        id: "js-interactive",
        title: "Simple Interactive Example",
        language: "javascript",
        summary: "Combine selection, events, and conditionals to build a tiny working app — a to-do item adder.",
        explanation: [
          "Read the input’s value, create a new <li>, append it to the list, then clear the input.",
          "This pattern — select, listen, update — is the heart of most interactive pages.",
        ],
        code: `const input = document.querySelector("#todo");
const list = document.querySelector("#list");
const btn = document.querySelector("#add");

btn.addEventListener("click", () => {
  if (input.value.trim() === "") return;
  const li = document.createElement("li");
  li.textContent = input.value;
  list.appendChild(li);
  input.value = "";
});`,
        previewHtml: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body { font-family: system-ui; padding: 24px; color: #111; }
input { padding: 6px; } button { padding: 6px 12px; border: none; background: #0088ff; color: white; border-radius: 6px; cursor: pointer; }
li { margin: 4px 0; }
</style></head><body>
<h3>To-Do</h3>
<input id="todo" placeholder="Add an item…">
<button id="add">Add</button>
<ul id="list"></ul>
<script>
const input = document.querySelector("#todo");
const list = document.querySelector("#list");
document.querySelector("#add").addEventListener("click", () => {
  if (input.value.trim() === "") return;
  const li = document.createElement("li");
  li.textContent = input.value;
  list.appendChild(li);
  input.value = "";
});
</script>
</body></html>`,
        mistakes: [
          "Not checking for empty input — blank items get added.",
          "Forgetting input.value = \"\" to reset the box after adding.",
        ],
        tips: ["Listen for the Enter key too with a keydown listener on the input for a nicer UX."],
      },
    ],
  },
];

// Flatten all lessons into a single ordered list with section refs.
export interface FlatLesson extends Lesson {
  sectionId: string;
  sectionTitle: string;
  index: number; // global index across all sections
}

export const FLAT_LESSONS: FlatLesson[] = GUIDE_SECTIONS.flatMap((section) =>
  section.lessons.map((lesson) => ({ ...lesson, sectionId: section.id, sectionTitle: section.title })),
).map((lesson, i) => ({ ...lesson, index: i }));