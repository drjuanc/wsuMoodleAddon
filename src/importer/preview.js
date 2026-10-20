// What the preview table shows for each question, as plain data, so it can
// be tested without a page. importer.js turns it into table rows.
(() => {
  const TYPE_NAMES = { multichoice: "MCQ", matching: "Matching" };

  // Returns { number, type, stemHtml, marks, tags, excluded, reasons,
  // warnings } plus, for an MCQ, options (["A. text", …]) and answer
  // ("B"), or for a matching question, pairs
  // ([{ label: "1.", html, answer: "1 → term" }, …]) and extras (terms).
  // stemHtml and pair html are the parser's escaped HTML, as in the XML.
  function previewModel(q) {
    const supported = q.type in TYPE_NAMES;
    const reasons = q.flags.filter((f) => f.blocking).map((f) => f.message);
    const warnings = q.flags.filter((f) => !f.blocking).map((f) => f.message);
    if (!supported) reasons.unshift("Unsupported question type");
    const model = {
      number: `Q${q.number}`,
      type: TYPE_NAMES[q.type] || q.type,
      stemHtml: q.stemHtml || "",
      marks: q.marks == null ? "" : String(q.marks),
      tags: q.tags.join("; "),
      excluded: q.excluded || !supported,
      reasons,
      warnings
    };
    if (q.type === "matching") {
      model.pairs = (q.pairs || []).map((p, i) => ({ label: `${i + 1}.`, html: p.html, answer: `${i + 1} → ${p.answer}` }));
      model.extras = q.extras || [];
    } else {
      const options = q.options || [];
      const correct = options.filter((o) => o.correct).map((o) => o.letter).join(", ");
      model.options = options.map((o) => `${o.letter}. ${o.text}`);
      model.answer = correct;
    }
    return model;
  }

  const api = { previewModel };
  if (typeof module === "object" && module.exports) module.exports = api;
  else (globalThis.wsuImporter = globalThis.wsuImporter || {}).preview = api;
})();
