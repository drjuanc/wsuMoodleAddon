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
  const KEPT_IMAGE = /^(?:https?:\/\/|data:image\/(?:png|jpeg|gif|webp);base64,)/i;
  const FILE_SRC = /^file:/i;

  // List marker Word left as text: A.  a)  (a)  1.  3)  (3)  i.  (iv)  •  ·  ▪  ◦  §  o
  const MARKER = /^(?:\(?(?:[A-Za-z]|\d{1,3}|[ivxlcdm]{1,6}|[IVXLCDM]{1,6})[.)]|[•·▪◦‣§o])[\t ]+(?=\S)/;
  // Question numbers and option letters: 3.  3)  (3)  A.  b)  (c)
  const NUMBER_OR_LETTER = /^\(?(?:\d{1,3}|[A-Za-z])[.)]$/;
  const NUMBER_MARKER = /^\(?(?:\d{1,3}|[A-Za-z])[.)][\t ]+(?=\S)/;
  // Statement numbers that MCQ options refer to ("i and iii only"); I, V and X
  // are treated as roman even in a lettered list
  const ROMAN = /^\(?(?:i|ii|iii|iv|v|vi|vii|viii|ix|x)[.)]$/i;

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

  // Only web images and embedded PNG/JPEG/GIF/WebP survive; file: (Word's local
  // copies, unless paired with the clipboard image), other data: types and
  // anything else would not display in Moodle or are unsafe
  function keepImage(img) {
    const src = (img.getAttribute("src") || "").trim();
    if (!KEPT_IMAGE.test(src)) {
      img.remove();
      return;
    }
    const alt = img.getAttribute("alt");
    for (const name of img.getAttributeNames()) img.removeAttribute(name);
    img.setAttribute("src", src);
    if (alt !== null) img.setAttribute("alt", alt);
  }

  // Word's automatic numbering sits in <span style="mso-list:Ignore">. Question
  // numbers and option letters are removed (Moodle numbers questions and
  // options itself); roman numerals and bullets stay as text.
  function removeAutonumbers(body) {
    for (const span of Array.from(body.querySelectorAll("[style]"))) {
      if (!/mso-list\s*:\s*ignore/i.test(span.getAttribute("style")) || !body.contains(span)) continue;
      const marker = span.textContent.replace(/[\s\u00a0]/g, "");
      if (NUMBER_OR_LETTER.test(marker) && !ROMAN.test(marker)) span.remove();
    }
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
        keepImage(child);
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
    // Removed elements can leave two spaces side by side
    const texts = body.ownerDocument.createTreeWalker(body, NodeFilter.SHOW_TEXT);
    for (let t = texts.nextNode(); t; t = texts.nextNode()) t.data = t.data.replace(/ {2,}/g, " ");
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

  // Typed markers. A single paragraph loses any leading marker. In a longer
  // paste only the first paragraph loses a question number or option letter:
  // the rest may be a list whose numbering is referred to elsewhere (e.g. MCQ
  // options citing i, ii, iii), and roman numerals are always kept.
  function stripListMarker(body) {
    const single = body.querySelectorAll("p").length <= 1 && !body.querySelector("ul, ol, li, table, br");
    const first = single ? body.querySelector("p") || body : body.querySelector("p, ul, ol, table");
    if (!first || (!single && first.tagName !== "P")) return;
    const texts = inlineNodes(first, false).filter((n) => n.nodeType === Node.TEXT_NODE);
    const match = (single ? MARKER : NUMBER_MARKER).exec(texts.map((t) => t.data).join("").slice(0, 40));
    if (!match || (!single && ROMAN.test(match[0].trim()))) return;
    let n = match[0].length;
    for (const t of texts) {
      const k = Math.min(n, t.data.length);
      t.data = t.data.slice(k);
      n -= k;
      if (!n) break;
    }
  }

  function parse(html) {
    const source = String(html)
      .replace(/<!--\[if[\s\S]*?<!\[endif\]-->/gi, "") // Word conditional blocks
      .replace(/<!\[(?:if[^\]]*|endif)\]>/gi, "");    // their downlevel-revealed markers
    return new DOMParser().parseFromString(source, "text/html").body;
  }

  function fileImages(body) {
    return Array.from(body.querySelectorAll("img"))
      .filter((img) => FILE_SRC.test((img.getAttribute("src") || "").trim()));
  }

  // options.fileImage: data URL for the paste's one file: image (see pairedImage)
  function clean(html, options = {}) {
    const body = parse(html);
    if (options.fileImage) {
      const images = fileImages(body);
      if (images.length === 1) images[0].setAttribute("src", options.fileImage);
    }

    removeAutonumbers(body);
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

  // The same file can be listed in both items and files, so use one or the other
  function imageFiles(data) {
    const items = Array.from(data.items || [])
      .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter(Boolean);
    return items.length ? items : Array.from(data.files || []).filter((file) => file.type.startsWith("image/"));
  }

  function hasImageFile(data) {
    return imageFiles(data).length > 0;
  }

  // Word's HTML refers to its images by file: paths the page cannot read. Only
  // when there is exactly one such image and exactly one image file can they
  // safely be matched: Word may also put a picture of the whole selection on
  // the clipboard, which must never stand in for one of several images.
  function pairedImage(data, html) {
    const files = imageFiles(data);
    return files.length === 1 && html && fileImages(parse(html)).length === 1 ? files[0] : null;
  }

  // A real image paste (screenshot, or a picture copied from Word) is left to
  // the editor, unless it is a single Word image we can embed ourselves. Word
  // may also put a rendered picture of copied text on the clipboard; then the
  // HTML has no <img>, so the text is cleaned as normal.
  function isImagePaste(data) {
    if (!hasImageFile(data)) return false;
    const html = data.getData("text/html");
    const text = data.getData("text/plain");
    if (!html && !text.trim()) return true;
    return /<img[\s>\/]/i.test(html) && !pairedImage(data, html);
  }

  function readAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  function cleanPaste(html, text, fileImage) {
    let out = html ? clean(html, { fileImage }) : "";
    if (!out && text) out = clean(plainToHtml(text));
    return out;
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

    e.preventDefault();
    e.stopImmediatePropagation(); // keep TinyMCE's own paste handling out of it
    const doc = target.ownerDocument;
    const insert = (out) => out && doc.execCommand("insertHTML", false, out);

    // Taken now: the clipboard cannot be read once this handler returns
    const file = pairedImage(data, html);
    if (!file) {
      insert(cleanPaste(html, text));
      return;
    }

    // Reading the image is asynchronous, so put the caret back afterwards.
    // If the read fails, the paste still goes in, without the image.
    const selection = doc.getSelection();
    const range = selection.rangeCount ? selection.getRangeAt(0).cloneRange() : null;
    let host = target;
    while (host.parentElement && host.parentElement.isContentEditable) host = host.parentElement;
    readAsDataUrl(file)
      .catch(() => "")
      .then((url) => {
        host.focus({ preventScroll: true });
        if (range) {
          selection.removeAllRanges();
          selection.addRange(range);
        }
        insert(cleanPaste(html, text, url));
      });
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
