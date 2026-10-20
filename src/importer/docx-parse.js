// Reads a .docx of single-answer MCQs into plain question objects for the
// preview and the Moodle XML generator. Rules: docs/importer-spec.md.
// Loaded as a classic script (content script, after lib/jszip.min.js) or
// required from Node for the offline tests; JSZip and DOMParser can be passed
// in for Node, otherwise the globals are used.
(() => {
  const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
  const M = "http://schemas.openxmlformats.org/officeDocument/2006/math";

  const QUESTION_FMT = new Set(["decimal", "decimalZero"]);
  const OPTION_FMT = new Set(["upperLetter", "lowerLetter"]);
  // Typed fallback when a paragraph has no list numbering
  const TYPED_QUESTION = /^\s*(\d{1,3})[.)]\s*/;
  const TYPED_OPTION = /^\s*([A-Ha-h])[.)]\s+/;

  const KNOWN_LABELS = new Set(["marks", "topic", "task", "bloom"]);
  const TAG_LABELS = ["topic", "task", "bloom"];
  const MAX_TAG_LENGTH = 50;
  const MARKS = /^(\d+(?:\.\d+)?)(?:\s*marks?)?$/i;

  // Flags that keep a question out of the XML. The rest are warnings the
  // lecturer sees in the preview.
  const BLOCKING = new Set([
    "no-options", "too-few-options", "no-correct", "several-correct",
    "no-table", "no-marks", "bad-marks", "image", "equation"
  ]);

  // ---- XML helpers ----

  function children(el, name) {
    const out = [];
    for (let n = el && el.firstChild; n; n = n.nextSibling) {
      if (n.nodeType === 1 && n.namespaceURI === W && (!name || n.localName === name)) out.push(n);
    }
    return out;
  }

  function child(el, name) {
    for (let n = el && el.firstChild; n; n = n.nextSibling) {
      if (n.nodeType === 1 && n.namespaceURI === W && n.localName === name) return n;
    }
    return null;
  }

  function val(el) {
    return el ? el.getAttributeNS(W, "val") : null;
  }

  function hasDescendant(el, ns, name) {
    return el.getElementsByTagNameNS(ns, name).length > 0;
  }

  // ---- styles.xml ----

  function readStyles(doc) {
    const styles = new Map();
    if (!doc) return styles;
    for (const s of Array.from(doc.getElementsByTagNameNS(W, "style"))) {
      const pPr = child(s, "pPr");
      const numPr = child(pPr, "numPr");
      styles.set(s.getAttributeNS(W, "styleId"), {
        basedOn: val(child(s, "basedOn")),
        numId: val(child(numPr, "numId")),
        ilvl: val(child(numPr, "ilvl")),
        color: val(child(child(s, "rPr"), "color"))
      });
    }
    return styles;
  }

  // First value of `key` along the basedOn chain
  function styleProp(styles, id, key) {
    const seen = new Set();
    while (id && !seen.has(id)) {
      seen.add(id);
      const s = styles.get(id);
      if (!s) return null;
      if (s[key] != null) return s[key];
      id = s.basedOn;
    }
    return null;
  }

  // ---- numbering.xml ----

  function readNumbering(doc, styles) {
    const abstracts = new Map();
    const nums = new Map();
    if (doc) {
      for (const a of Array.from(doc.getElementsByTagNameNS(W, "abstractNum"))) {
        abstracts.set(a.getAttributeNS(W, "abstractNumId"), a);
      }
      for (const n of Array.from(doc.getElementsByTagNameNS(W, "num"))) {
        nums.set(n.getAttributeNS(W, "numId"), n);
      }
    }

    function lvlIn(parent, ilvl) {
      for (const l of children(parent, "lvl")) {
        if (l.getAttributeNS(W, "ilvl") === ilvl) return l;
      }
      return null;
    }

    // numId + ilvl → numFmt, via w:num (w:lvlOverride) → w:abstractNum
    // (following w:numStyleLink) → w:lvl
    function format(numId, ilvl, depth = 0) {
      const num = nums.get(numId);
      if (!num || depth > 5) return null;
      for (const o of children(num, "lvlOverride")) {
        if (o.getAttributeNS(W, "ilvl") !== ilvl) continue;
        const lvl = child(o, "lvl");
        if (lvl) return val(child(lvl, "numFmt")) || "decimal";
      }
      const abs = abstracts.get(val(child(num, "abstractNumId")));
      if (!abs) return null;
      const link = val(child(abs, "numStyleLink"));
      if (link) {
        const linked = styleProp(styles, link, "numId");
        return linked ? format(linked, ilvl, depth + 1) : null;
      }
      const lvl = lvlIn(abs, ilvl);
      return lvl ? val(child(lvl, "numFmt")) || "decimal" : null;
    }

    return { format };
  }

  // ---- paragraphs ----

  function isRed(hex) {
    if (!hex || !/^[0-9A-Fa-f]{6}$/.test(hex)) return false;
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return r >= 0x99 && g <= 0x40 && b <= 0x40;
  }

  function escapeHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // Runs in reading order, through hyperlinks, smart tags, fields and
  // insertions; deleted and moved-away text is skipped
  function runsOf(p) {
    const runs = [];
    (function walk(el) {
      for (const c of children(el)) {
        const name = c.localName;
        if (name === "r") runs.push(c);
        else if (name !== "pPr" && name !== "del" && name !== "moveFrom") walk(c);
      }
    })(p);
    return runs;
  }

  // Splits a paragraph into segments of {text, html, red, brk}; brk marks a
  // tab or line break, rendered as a space in options and <br> in stems
  function readParagraph(p, ctx) {
    const pPr = child(p, "pPr");
    const pStyle = val(child(pPr, "pStyle"));
    const segments = [];

    for (const r of runsOf(p)) {
      const rPr = child(r, "rPr");
      let color = val(child(rPr, "color"));
      if (color == null) color = styleProp(ctx.styles, val(child(rPr, "rStyle")), "color");
      if (color == null) color = styleProp(ctx.styles, pStyle, "color");
      const red = isRed(color);
      const align = val(child(rPr, "vertAlign"));
      const tag = align === "subscript" ? "sub" : align === "superscript" ? "sup" : null;

      for (const c of children(r)) {
        const name = c.localName;
        if (name === "t") {
          const text = c.textContent;
          if (!text) continue;
          const html = tag ? `<${tag}>${escapeHtml(text)}</${tag}>` : escapeHtml(text);
          segments.push({ text, html, red });
        } else if (name === "tab" || name === "cr" || (name === "br" && c.getAttributeNS(W, "type") !== "page")) {
          segments.push({ text: " ", html: "", red, brk: true });
        } else if (name === "noBreakHyphen") {
          segments.push({ text: "-", html: "-", red });
        }
      }
    }

    const text = segments.map(s => s.text).join("");
    return {
      el: p,
      segments,
      text,
      image: hasDescendant(p, W, "drawing") || hasDescendant(p, W, "pict") || hasDescendant(p, W, "object"),
      equation: hasDescendant(p, M, "oMath"),
      numFmt: paragraphNumFmt(pPr, pStyle, ctx)
    };
  }

  function paragraphNumFmt(pPr, pStyle, ctx) {
    const numPr = child(pPr, "numPr");
    let numId = val(child(numPr, "numId"));
    let ilvl = val(child(numPr, "ilvl"));
    if (numId == null) numId = styleProp(ctx.styles, pStyle, "numId");
    if (ilvl == null) ilvl = styleProp(ctx.styles, pStyle, "ilvl");
    if (!numId || numId === "0") return null;
    return ctx.numbering.format(numId, ilvl || "0");
  }

  // Drops a typed "3." or "B)" from the start of the segments
  function stripPrefix(segments, length) {
    let left = length;
    const out = [];
    for (const s of segments) {
      if (left <= 0 || s.brk) { out.push(s); left = 0; continue; }
      if (s.text.length <= left) { left -= s.text.length; continue; }
      const text = s.text.slice(left);
      left = 0;
      out.push({ ...s, text, html: s.html.replace(escapeHtml(s.text), escapeHtml(text)) });
    }
    return out;
  }

  // Assigns each non-empty paragraph a kind: question, option or text
  function classify(par) {
    if (OPTION_FMT.has(par.numFmt)) {
      par.kind = "option";
      par.letterCase = par.numFmt === "lowerLetter" ? "lower" : "upper";
      return;
    }
    if (QUESTION_FMT.has(par.numFmt)) { par.kind = "question"; return; }
    let m;
    if (!par.numFmt && (m = TYPED_QUESTION.exec(par.text))) {
      par.kind = "question";
      par.segments = stripPrefix(par.segments, m[0].length);
    } else if (!par.numFmt && (m = TYPED_OPTION.exec(par.text))) {
      par.kind = "option";
      par.letterCase = m[1] === m[1].toLowerCase() ? "lower" : "upper";
      par.segments = stripPrefix(par.segments, m[0].length);
    } else {
      par.kind = "text";
    }
  }

  // ---- body walk ----

  // Paragraphs and tables in reading order, unwrapping content controls
  function blocksOf(body) {
    const out = [];
    (function walk(el) {
      for (const c of children(el)) {
        if (c.localName === "p" || c.localName === "tbl") out.push(c);
        else if (c.localName === "sdt") walk(child(c, "sdtContent"));
        else if (c.localName === "customXml") walk(c);
      }
    })(body);
    return out;
  }

  function isEmpty(par) {
    return !par.text.trim() && !par.image && !par.equation;
  }

  // ---- building questions ----

  function trimHtml(html) {
    return html.replace(/^(?:\s|<br>)+|(?:\s|<br>)+$/g, "");
  }

  function stemParagraphHtml(segments) {
    const html = segments.map(s => (s.brk ? "<br>" : s.html)).join("");
    return trimHtml(html.replace(/^\s+|\s+$/g, ""));
  }

  function optionHtml(segments) {
    return segments.map(s => (s.brk ? " " : s.html)).join("").replace(/\s+/g, " ").trim();
  }

  function redShare(segments) {
    let red = 0;
    let all = 0;
    for (const s of segments) {
      const n = s.text.replace(/\s/g, "").length;
      all += n;
      if (s.red) red += n;
    }
    return all ? red / all : 0;
  }

  function cellText(tc) {
    const parts = [];
    for (const p of Array.from(tc.getElementsByTagNameNS(W, "p"))) {
      const t = runsOf(p)
        .map(r => children(r).map(c => (c.localName === "t" ? c.textContent : c.localName === "tab" ? " " : "")).join(""))
        .join("");
      parts.push(t);
    }
    return parts.join(" ").replace(/\s+/g, " ").trim();
  }

  function normaliseLabel(label) {
    return label
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ")
      .replace(/^bloom(?:['’]s|s)$/, "bloom");
  }

  function readTable(tbl, q) {
    const seen = new Set();
    for (const tr of children(tbl, "tr")) {
      for (const tc of children(tr, "tc")) {
        const text = cellText(tc);
        if (!text) continue;
        const colon = text.indexOf(":");
        if (colon < 0) {
          flag(q, "unknown-label", `Table cell without a label: "${text}"`);
          continue;
        }
        const label = normaliseLabel(text.slice(0, colon));
        const value = text.slice(colon + 1).replace(/\s+/g, " ").trim();
        if (!KNOWN_LABELS.has(label)) {
          flag(q, "unknown-label", `Unknown table label: "${text.slice(0, colon).trim()}"`);
          continue;
        }
        if (seen.has(label)) flag(q, "duplicate-label", `Table label used twice: "${label}"`);
        seen.add(label);
        q.meta[label] = value;
      }
    }
  }

  function finishQuestion(q) {
    const opts = q.options;
    if (!q.sawOptions) flag(q, "no-options", "No options found");
    else if (opts.length < 2) flag(q, "too-few-options", `Only ${opts.length} option`);

    const correct = opts.filter(o => o.correct).length;
    if (q.sawOptions && correct === 0) flag(q, "no-correct", "No option is marked in red");
    if (correct > 1) flag(q, "several-correct", `${correct} options are marked in red`);

    if (!q.sawTable) {
      flag(q, "no-table", "No metadata table after the options");
    } else if (q.meta.marks == null || q.meta.marks === "") {
      flag(q, "no-marks", "No Marks in the metadata table");
    } else {
      const m = MARKS.exec(q.meta.marks);
      if (m && Number(m[1]) > 0) q.marks = Number(m[1]);
      else flag(q, "bad-marks", `Marks is not a number: "${q.meta.marks}"`);
    }

    const seen = new Set();
    for (const label of TAG_LABELS) {
      const tag = (q.meta[label] || "").replace(/\s+/g, " ").trim();
      if (!tag || seen.has(tag.toLowerCase())) continue;
      seen.add(tag.toLowerCase());
      q.tags.push(tag);
      if (tag.includes(",")) flag(q, "tag-comma", `Tag contains a comma: "${tag}"`);
      if (tag.length > MAX_TAG_LENGTH) flag(q, "tag-long", `Tag longer than ${MAX_TAG_LENGTH} characters: "${tag}"`);
    }

    // Moodle's answernumbering: ABCD or abc, from the document's option letters
    q.numbering = opts.length && opts.every(o => o.letterCase === "lower") ? "abc" : "ABCD";
    opts.forEach((o, i) => {
      o.letter = String.fromCharCode(65 + i);
      delete o.letterCase;
    });

    q.excluded = q.flags.some(f => f.blocking);
    delete q.state;
    delete q.sawOptions;
    delete q.sawTable;
    delete q.stemParts;
    return q;
  }

  function flag(q, code, message) {
    if (q.flags.some(f => f.code === code && f.message === message)) return;
    q.flags.push({ code, message, blocking: BLOCKING.has(code) });
  }

  function checkMedia(q, par) {
    if (par.image) flag(q, "image", "Contains an image (not supported yet)");
    if (par.equation) flag(q, "equation", "Contains an equation (not supported yet)");
  }

  // ---- entry points ----

  // Parses the three XML parts of a .docx. Returns { questions, notes }.
  function parseDocxXml({ document, numbering, styles }, DOMParserImpl) {
    const Parser = DOMParserImpl || globalThis.DOMParser;
    const parse = s => (s ? new Parser().parseFromString(s, "application/xml") : null);
    const doc = parse(document);
    const body = doc && doc.getElementsByTagNameNS(W, "body")[0];
    if (!body) throw new Error("word/document.xml has no body");

    const styleMap = readStyles(parse(styles));
    const ctx = { styles: styleMap, numbering: readNumbering(parse(numbering), styleMap) };

    const questions = [];
    const notes = [];
    let preamble = 0;
    let q = null;

    const start = () => {
      if (q) questions.push(finishQuestion(q));
      q = {
        number: questions.length + 1,
        type: "multichoice",
        stemHtml: "",
        stemText: "",
        stemParts: [],
        options: [],
        marks: null,
        tags: [],
        meta: {},
        flags: [],
        excluded: false,
        state: "stem",
        sawOptions: false,
        sawTable: false
      };
    };

    for (const block of blocksOf(body)) {
      if (block.localName === "tbl") {
        if (!q) continue;
        if (q.state !== "table") {
          q.sawTable = true;
          q.state = "table";
          readTable(block, q);
        }
        continue;
      }

      const par = readParagraph(block, ctx);
      if (isEmpty(par)) continue;
      classify(par);

      if (par.kind === "question") {
        start();
      } else if (!q) {
        preamble++;
        continue;
      }

      if (par.kind === "question" || (par.kind === "text" && q.state === "stem")) {
        checkMedia(q, par);
        q.stemParts.push(par);
        q.stemHtml = q.stemParts.map(p => `<p>${stemParagraphHtml(p.segments)}</p>`).join("");
        q.stemText = q.stemParts.map(p => p.segments.map(s => s.text).join("").replace(/\s+/g, " ").trim()).join(" ");
      } else if (par.kind === "option") {
        checkMedia(q, par);
        if (q.state === "after") flag(q, "options-split", "Text between options");
        if (q.state === "table") {
          flag(q, "option-after-table", "Option after the metadata table");
          continue;
        }
        q.sawOptions = true;
        q.state = "options";
        q.options.push({
          html: optionHtml(par.segments),
          text: par.segments.map(s => s.text).join("").replace(/\s+/g, " ").trim(),
          correct: redShare(par.segments) >= 0.5,
          letterCase: par.letterCase
        });
      } else if (q.state === "options" || q.state === "after") {
        checkMedia(q, par);
        q.state = "after";
        flag(q, "text-before-table", "Text between the last option and the table");
      }
      // Text after the table and before the next question is ignored
    }
    if (q) questions.push(finishQuestion(q));

    if (preamble) notes.push({ code: "preamble-skipped", message: `Preamble skipped (${preamble} paragraphs)`, count: preamble });
    if (!questions.length) notes.push({ code: "no-questions", message: "No numbered questions found" });
    return { questions, notes };
  }

  // Parses a .docx given as a base64 string (as the content script passes it),
  // ArrayBuffer, Uint8Array, Blob or File
  async function parseDocx(data, deps = {}) {
    const Zip = deps.JSZip || globalThis.JSZip;
    const zip = await Zip.loadAsync(data, { base64: typeof data === "string" });
    const read = name => (zip.file(name) ? zip.file(name).async("string") : null);
    const document = await read("word/document.xml");
    if (!document) throw new Error("Not a Word document (no word/document.xml)");
    return parseDocxXml(
      { document, numbering: await read("word/numbering.xml"), styles: await read("word/styles.xml") },
      deps.DOMParser
    );
  }

  const api = { parseDocx, parseDocxXml, isRed };
  if (typeof module === "object" && module.exports) module.exports = api;
  else (globalThis.wsuImporter = globalThis.wsuImporter || {}).docx = api;
})();
