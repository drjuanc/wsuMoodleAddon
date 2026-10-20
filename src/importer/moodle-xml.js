// Turns the questions from docx-parse.js into Moodle XML for the question
// bank import page. No <category> is written: the category chosen on the
// import page is used. Questions with a blocking flag are left out.
(() => {
  const NAME_LENGTH = 80;

  function escapeXml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // CDATA cannot hold "]]>", so split it across two sections
  function cdata(s) {
    return `<![CDATA[${String(s).replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
  }

  // Question bank name: the stem, cut at a word boundary
  function questionName(q) {
    const text = q.stemText.replace(/\s+/g, " ").trim() || `Question ${q.number}`;
    if (text.length <= NAME_LENGTH) return text;
    const cut = text.slice(0, NAME_LENGTH);
    const space = cut.lastIndexOf(" ");
    return `${(space > NAME_LENGTH / 2 ? cut.slice(0, space) : cut).replace(/[\s.,;:]+$/, "")}…`;
  }

  function htmlText(tag, html, indent) {
    return `${indent}<${tag} format="html">\n${indent}  <text>${cdata(html)}</text>\n${indent}</${tag}>`;
  }

  function emptyHtml(tag, indent) {
    return `${indent}<${tag} format="html">\n${indent}  <text></text>\n${indent}</${tag}>`;
  }

  function multichoice(q, opts) {
    const i = "    ";
    const lines = [
      `  <question type="multichoice">`,
      `${i}<name>\n${i}  <text>${escapeXml(questionName(q))}</text>\n${i}</name>`,
      htmlText("questiontext", q.stemHtml, i),
      emptyHtml("generalfeedback", i),
      `${i}<defaultgrade>${q.marks}</defaultgrade>`,
      `${i}<penalty>0.3333333</penalty>`,
      `${i}<hidden>0</hidden>`,
      `${i}<idnumber></idnumber>`,
      `${i}<single>true</single>`,
      `${i}<shuffleanswers>${opts.shuffleAnswers ? "true" : "false"}</shuffleanswers>`,
      `${i}<answernumbering>${q.numbering || "ABCD"}</answernumbering>`,
      `${i}<showstandardinstruction>0</showstandardinstruction>`,
      emptyHtml("correctfeedback", i),
      emptyHtml("partiallycorrectfeedback", i),
      emptyHtml("incorrectfeedback", i)
    ];
    for (const o of q.options) {
      lines.push(
        `${i}<answer fraction="${o.correct ? 100 : 0}" format="html">`,
        `${i}  <text>${cdata(o.html)}</text>`,
        emptyHtml("feedback", `${i}  `),
        `${i}</answer>`
      );
    }
    if (q.tags.length) {
      lines.push(`${i}<tags>`);
      for (const t of q.tags) lines.push(`${i}  <tag><text>${escapeXml(t)}</text></tag>`);
      lines.push(`${i}</tags>`);
    }
    lines.push(`  </question>`);
    return lines.join("\n");
  }

  // Returns { xml, included, skipped }; included and skipped hold question
  // numbers. Options: shuffleAnswers (default false, as Word fixes the order
  // and options may refer to each other, e.g. "Both A and B").
  function buildMoodleXml(questions, opts = {}) {
    const included = [];
    const skipped = [];
    const parts = [];
    for (const q of questions) {
      if (q.excluded || q.type !== "multichoice") {
        skipped.push(q.number);
        continue;
      }
      included.push(q.number);
      parts.push(multichoice(q, opts));
    }
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<quiz>\n${parts.join("\n")}\n</quiz>\n`;
    return { xml, included, skipped };
  }

  const api = { buildMoodleXml, questionName };
  if (typeof module === "object" && module.exports) module.exports = api;
  else (globalThis.wsuImporter = globalThis.wsuImporter || {}).moodleXml = api;
})();
