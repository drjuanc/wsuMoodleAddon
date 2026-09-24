// Cleans HTML pasted from MS Word into Moodle's rich-text editors (TinyMCE
// iframes and Atto contenteditable divs). Runs in every frame on wiseup; the
// top frame also attaches to same-origin editor iframes as a fallback, in
// case an editor rewrites its frame with document.open() and wipes the
// listener this script added at document_start.
(() => {
  // Tags kept as they are (attributes still stripped)
  const KEEP = new Set([
    "P", "BR", "STRONG", "B", "EM", "I", "U", "SUB", "SUP", "UL", "OL", "LI", "A",
    "TABLE", "THEAD", "TBODY", "TFOOT", "TR", "TD", "TH"
  ]);
  // Block tags turned into <p> (or unwrapped if they hold other blocks)
  const TO_P = new Set([
    "H1", "H2", "H3", "H4", "H5", "H6", "DIV", "BLOCKQUOTE",
    "SECTION", "ARTICLE", "HEADER", "FOOTER", "ADDRESS", "CENTER", "PRE", "DT", "DD"
  ]);
  // Removed together with their contents
  const DROP = new Set([
    "HEAD", "STYLE", "SCRIPT", "META", "LINK", "TITLE", "XML", "NOSCRIPT", "TEMPLATE",
    "PICTURE", "SVG", "MATH", "OBJECT", "EMBED", "IFRAME", "VIDEO", "AUDIO", "CANVAS",
    "MAP", "AREA", "BUTTON", "INPUT", "SELECT", "TEXTAREA", "COLGROUP", "COL"
  ]);
  // Office namespaces: o:p (spacing), v: (VML images), w: (settings), m: (equations).
  // Other namespaced tags, such as st1: smart tags, are unwrapped so their text survives.
  const DROP_NS = /^[OVWM]:/;
  const BLOCKS = new Set(["P", "UL", "OL", "LI", "TABLE", "THEAD", "TBODY", "TFOOT", "TR", "TD", "TH"]);
  const CONTAINERS = new Set(["BODY", "UL", "OL", "TABLE", "THEAD", "TBODY", "TFOOT", "TR"]);
  const KEEP_EMPTY = new Set(["BR", "IMG", "TABLE", "THEAD", "TBODY", "TFOOT", "TR", "TD", "TH"]);
  const SAFE_SCHEME = /^(https?|mailto|tel|ftp)$/i;
  const WEB_IMAGE = /^https?:\/\//i;

  // List marker Word left as text: A.  a)  (a)  1.  (1)  i.  (iv)  •  ·  ▪  ◦  §  o
  const MARKER = /^(?:\(?(?:[A-Za-z]|\d{1,3}|[ivxlcdm]{1,6}|[IVXLCDM]{1,6})[.)]|[•·▪◦‣§o])[\t ]+(?=\S)/;

  function unwrap(el) {
    el.replaceWith(...el.childNodes);
  }

  function renameToP(el) {
    const p = el.ownerDocument.createElement("p");
    p.append(...el.childNodes);
    el.replaceWith(p);
  }

  function stripAttributes(el, tag) {
    const href = tag === "A" ? (el.getAttribute("href") || "").trim() : "";
    const spans = tag === "TD" || tag === "TH"
      ? [["colspan", el.getAttribute("colspan")], ["rowspan", el.getAttribute("rowspan")]]
      : [];
    for (const name of el.getAttributeNames()) el.removeAttribute(name);

    if (href && !href.startsWith("#")) {
      const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(href);
      if (!scheme || SAFE_SCHEME.test(scheme[1])) el.setAttribute("href", href);
    }
    for (const [name, value] of spans) {
      if (/^\d+$/.test(value || "") && Number(value) > 1) el.setAttribute(name, value);
    }
  }

  // Only images already on the web survive; file: (Word's local copies), data:
  // and anything else would not display in Moodle or would bloat the page
  function keepWebImage(img) {
    const src = (img.getAttribute("src") || "").trim();
    if (!WEB_IMAGE.test(src)) {
      img.remove();
      return;
    }
    const alt = img.getAttribute("alt");
    for (const name of img.getAttributeNames()) img.removeAttribute(name);
    img.setAttribute("src", src);
    if (alt !== null) img.setAttribute("alt", alt);
  }

  // Depth-first: children are cleaned before their parent is kept, renamed or unwrapped
  function sanitise(node) {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        child.data = child.data.replace(/[\s ]+/g, " ");
        continue;
      }
      if (child.nodeType !== Node.ELEMENT_NODE) {
        child.remove(); // comments, including Word's conditional ones
        continue;
      }
      const tag = child.tagName.toUpperCase();
      if (DROP.has(tag) || DROP_NS.test(tag)) {
        child.remove();
        continue;
      }
      if (tag === "IMG") {
        keepWebImage(child);
        continue;
      }
      sanitise(child);
      if (TO_P.has(tag)) {
        if (child.querySelector("p, ul, ol, table")) unwrap(child);
        else renameToP(child);
      } else if (!KEEP.has(tag)) {
        unwrap(child);
      } else {
        stripAttributes(child, tag);
        if (tag === "A" && !child.hasAttribute("href")) unwrap(child);
      }
    }
  }

  // Text nodes, <br>s and <img>s belonging to a block, not descending into nested blocks
  function inlineNodes(block, withBlankText) {
    const walker = block.ownerDocument.createTreeWalker(
      block,
      NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
      {
        acceptNode: (n) => n.nodeType === Node.ELEMENT_NODE && BLOCKS.has(n.tagName)
          ? NodeFilter.FILTER_REJECT
          : NodeFilter.FILTER_ACCEPT
      }
    );
    const out = [];
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (n.nodeType === Node.TEXT_NODE ? withBlankText || n.data.trim() : n.tagName === "BR" || n.tagName === "IMG") {
        out.push(n);
      }
    }
    return out;
  }

  function blocksOf(body) {
    return [body, ...body.querySelectorAll("p, li, td, th")];
  }

  // Collapse runs of <br> and drop any at the start or end of a block
  function tidyBreaks(body) {
    for (const block of blocksOf(body)) {
      const nodes = inlineNodes(block, false);
      let afterBreak = true;
      for (const n of nodes) {
        if (n.nodeName === "BR") {
          if (afterBreak) n.remove();
          afterBreak = true;
        } else {
          afterBreak = false;
        }
      }
      for (let i = nodes.length - 1; i >= 0 && nodes[i].nodeName === "BR"; i--) nodes[i].remove();
    }
  }

  // Innermost first, so a <p> holding only an empty <span> goes as well
  function removeEmpty(body) {
    for (const el of Array.from(body.querySelectorAll("*")).reverse()) {
      if (KEEP_EMPTY.has(el.tagName)) continue;
      if (!el.textContent.trim() && !el.querySelector("br, img, table")) el.remove();
    }
  }

  function trimWhitespace(body) {
    for (const block of blocksOf(body)) {
      // Stop at the first <br> or <img>: the space beside it is between words
      const nodes = inlineNodes(block, true);
      for (const t of nodes) {
        if (t.nodeType !== Node.TEXT_NODE) break;
        t.data = t.data.replace(/^\s+/, "");
        if (t.data) break;
      }
      for (const t of nodes.reverse()) {
        if (t.nodeType !== Node.TEXT_NODE) break;
        t.data = t.data.replace(/\s+$/, "");
        if (t.data) break;
      }
    }
    for (const br of body.querySelectorAll("br")) {
      const prev = br.previousSibling, next = br.nextSibling;
      if (prev && prev.nodeType === Node.TEXT_NODE) prev.data = prev.data.replace(/\s+$/, "");
      if (next && next.nodeType === Node.TEXT_NODE) next.data = next.data.replace(/^\s+/, "");
    }
    // Whitespace between blocks, e.g. the line breaks in Word's source
    const walker = body.ownerDocument.createTreeWalker(body, NodeFilter.SHOW_TEXT);
    const blanks = [];
    for (let t = walker.nextNode(); t; t = walker.nextNode()) {
      if (t.data.trim()) continue;
      const isBlock = (n) => n && n.nodeType === Node.ELEMENT_NODE && BLOCKS.has(n.tagName);
      if (!t.data || CONTAINERS.has(t.parentNode.tagName) || isBlock(t.previousSibling) || isBlock(t.nextSibling)) {
        blanks.push(t);
      }
    }
    for (const t of blanks) t.remove();
  }

  // Only for a single paragraph: several paragraphs may be a list whose
  // numbering is referred to elsewhere (e.g. MCQ options citing i, ii, iii)
  function stripListMarker(body) {
    const paragraphs = body.querySelectorAll("p").length;
    if (paragraphs > 1 || body.querySelector("ul, ol, li, table, br")) return;
    const texts = inlineNodes(body.querySelector("p") || body, false)
      .filter((n) => n.nodeType === Node.TEXT_NODE);
    const match = MARKER.exec(texts.map((t) => t.data).join("").slice(0, 40));
    if (!match) return;
    let n = match[0].length;
    for (const t of texts) {
      const k = Math.min(n, t.data.length);
      t.data = t.data.slice(k);
      n -= k;
      if (!n) break;
    }
  }

  function clean(html) {
    const source = String(html)
      .replace(/<!--\[if[\s\S]*?<!\[endif\]-->/gi, "") // Word conditional blocks
      .replace(/<!\[(?:if[^\]]*|endif)\]>/gi, "");    // their downlevel-revealed markers
    const doc = new DOMParser().parseFromString(source, "text/html");
    const body = doc.body;

    sanitise(body);
    body.normalize();
    tidyBreaks(body);
    removeEmpty(body);
    trimWhitespace(body);
    stripListMarker(body);
    removeEmpty(body);
    body.normalize();

    // A lone paragraph is inserted inline, so it joins the paragraph being typed in
    // rather than splitting it
    if (body.childNodes.length === 1 && body.firstChild.nodeName === "P") unwrap(body.firstChild);
    return body.innerHTML;
  }

  function plainToHtml(text) {
    const escape = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return String(text)
      .replace(/\r\n?/g, "\n")
      .trim()
      .split(/\n[ \t ]*\n+/)
      .map((para) => "<p>" + escape(para).replace(/\n/g, "<br>") + "</p>")
      .join("");
  }

  function hasImageFile(data) {
    return Array.from(data.items || []).some((item) => item.kind === "file" && item.type.startsWith("image/"))
      || Array.from(data.files || []).some((file) => file.type.startsWith("image/"));
  }

  // A real image paste (screenshot, or a picture copied from Word) is left to
  // the editor. Word also puts a rendered picture of copied text on the
  // clipboard; then the HTML has no <img>, so the text is cleaned as normal.
  function isImagePaste(data) {
    if (!hasImageFile(data)) return false;
    const html = data.getData("text/html");
    const text = data.getData("text/plain");
    return (!html && !text.trim()) || /<img[\s>\/]/i.test(html);
  }

  function onPaste(e) {
    // Another copy of this listener (frame script or top-frame fallback) got there first
    if (e.defaultPrevented) return;
    const target = e.target.nodeType === Node.ELEMENT_NODE ? e.target : e.target.parentElement;
    if (!target || !target.isContentEditable) return; // <input>, <textarea> and the rest of the page
    const data = e.clipboardData;
    if (!data || isImagePaste(data)) return;

    const html = data.getData("text/html");
    const text = data.getData("text/plain");
    if (!html && !text) return;

    let out = html ? clean(html) : "";
    if (!out && text) out = clean(plainToHtml(text));

    e.preventDefault();
    e.stopImmediatePropagation(); // keep TinyMCE's own paste handling out of it
    if (out) target.ownerDocument.execCommand("insertHTML", false, out);
  }

  const api = { clean, plainToHtml, hasImageFile, isImagePaste, onPaste };

  // Loaded by test/paste-test.html rather than as an extension content script
  if (typeof chrome === "undefined" || !chrome.storage || !chrome.storage.local) {
    globalThis.WsuPasteClean = api;
    return;
  }

  const isTop = window === window.top;
  const attached = new Set();
  let active = false;

  function attach(doc) {
    // Re-adding the same function is ignored by the browser, so this is safe to repeat
    doc.addEventListener("paste", onPaste, true);
    attached.add(doc);
  }

  // Follow focus down into same-origin iframes (TinyMCE's editor frame)
  function attachFocusedFrames() {
    let frame = document.activeElement;
    while (frame && frame.tagName === "IFRAME") {
      let doc;
      try {
        doc = frame.contentDocument;
      } catch {
        return;
      }
      if (!doc) return;
      attach(doc);
      frame = doc.activeElement;
    }
  }

  // Focus moving into an editor iframe blurs the top window
  function onTopBlur() {
    setTimeout(attachFocusedFrames, 0);
  }

  function apply(on) {
    if (on === active) return;
    active = on;
    if (on) {
      attach(document);
      if (isTop) {
        window.addEventListener("blur", onTopBlur, true);
        attachFocusedFrames();
      }
    } else {
      for (const doc of attached) {
        try {
          doc.removeEventListener("paste", onPaste, true);
        } catch {
          // frame has gone
        }
      }
      attached.clear();
      if (isTop) window.removeEventListener("blur", onTopBlur, true);
    }
  }

  // Initial state (defaults to ON); "enabled" is the pre-1.4 key, read only
  // until the background script has migrated it
  chrome.storage.local.get(["cleanPaste", "enabled"])
    .then(({ cleanPaste, enabled }) => apply(cleanPaste ?? enabled ?? true));

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && "cleanPaste" in changes) {
      apply(changes.cleanPaste.newValue !== false);
    }
  });
})();
