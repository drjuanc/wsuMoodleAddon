// Turns the questions from docx-parse.js into Moodle XML for the question
// bank import page. A <category> question is written only if opts.category is
// given; otherwise the category chosen on the import page is used. Questions
// with a blocking flag are left out.
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

  // Moodle switches to (and creates) this category when "Get category from
  // file" is ticked, e.g. "$course$/top/From MS Word"
  function category(path) {
    const i = "    ";
    return [
      `  <question type="category">`,
      `${i}<category>\n${i}  <text>${escapeXml(path)}</text>\n${i}</category>`,
      emptyHtml("info", i),
      `${i}<idnumber></idnumber>`,
      `  </question>`
    ].join("\n");
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
    return finish(q, lines);
  }

  // Never shuffled; distractors are subquestions with empty text
  function matching(q) {
    const i = "    ";
    const lines = [
      `  <question type="matching">`,
      `${i}<name>\n${i}  <text>${escapeXml(questionName(q))}</text>\n${i}</name>`,
      htmlText("questiontext", q.stemHtml, i),
      emptyHtml("generalfeedback", i),
      `${i}<defaultgrade>${q.marks}</defaultgrade>`,
      `${i}<penalty>0.3333333</penalty>`,
      `${i}<hidden>0</hidden>`,
      `${i}<idnumber></idnumber>`,
      `${i}<shuffleanswers>0</shuffleanswers>`,
      emptyHtml("correctfeedback", i),
      emptyHtml("partiallycorrectfeedback", i),
      emptyHtml("incorrectfeedback", i)
    ];
    const subquestion = (text, answer) => lines.push(
      `${i}<subquestion format="html">`,
      `${i}  <text>${text}</text>`,
      `${i}  <answer>\n${i}    <text>${escapeXml(answer)}</text>\n${i}  </answer>`,
      `${i}</subquestion>`
    );
    for (const p of q.pairs) subquestion(cdata(p.html), p.answer);
    for (const t of q.extras) subquestion("", t);
    return finish(q, lines);
  }

  // Tags and the closing tag, shared by both question types
  function finish(q, lines) {
    const i = "    ";
    if (q.tags.length) {
      lines.push(`${i}<tags>`);
      for (const t of q.tags) lines.push(`${i}  <tag><text>${escapeXml(t)}</text></tag>`);
      lines.push(`${i}</tags>`);
    }
    lines.push(`  </question>`);
    return lines.join("\n");
  }

  const WRITERS = { multichoice, matching };

  // Returns { xml, included, skipped }; included and skipped hold question
  // numbers. Options: shuffleAnswers (default false, as Word fixes the order
  // and options may refer to each other, e.g. "Both A and B"); category (a
  // Moodle category path, written before the questions).
  function buildMoodleXml(questions, opts = {}) {
    const included = [];
    const skipped = [];
    const parts = opts.category ? [category(opts.category)] : [];
    for (const q of questions) {
      if (q.excluded || !WRITERS[q.type]) {
        skipped.push(q.number);
        continue;
      }
      included.push(q.number);
      parts.push(WRITERS[q.type](q, opts));
    }
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<quiz>\n${parts.join("\n")}\n</quiz>\n`;
    return { xml, included, skipped };
  }

  const api = { buildMoodleXml, questionName };
  if (typeof module === "object" && module.exports) module.exports = api;
  else (globalThis.wsuImporter = globalThis.wsuImporter || {}).moodleXml = api;
})();
