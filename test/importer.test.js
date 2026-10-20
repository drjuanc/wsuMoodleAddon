// Offline tests for src/importer/. Run with: npm test
// Uses test/mock-test.docx and test/mock-matching.docx (dummy items, see
// test/FIXTURES.md) plus small
// .docx files built here for rules the fixture does not exercise.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const JSZip = require("jszip");
const { DOMParser } = require("@xmldom/xmldom");
const { parseDocx } = require("../src/importer/docx-parse.js");
const { buildMoodleXml } = require("../src/importer/moodle-xml.js");

const deps = { JSZip, DOMParser };
const tests = [];
const test = (name, fn) => tests.push({ name, fn });

// ---- mock-test.docx ----

test("mock-test.docx: 8 MCQs, 4 options, one correct, marks, tags, no flags", async () => {
  const data = fs.readFileSync(path.join(__dirname, "mock-test.docx"));
  const { questions, notes } = await parseDocx(data, deps);

  assert.equal(questions.length, 8);
  assert.deepEqual(notes.map(n => n.code), ["preamble-skipped"]);

  // Correct letters and marks from docs/findings-docx.md
  const correct = ["A", "B", "B", "D", "B", "B", "B", "A"];
  const marks = [1, 1, 1, 4, 1, 1, 1, 1];
  questions.forEach((q, i) => {
    const where = `question ${q.number}`;
    assert.deepEqual(q.flags, [], `${where} flags: ${JSON.stringify(q.flags)}`);
    assert.equal(q.excluded, false, where);
    assert.equal(q.options.length, 4, where);
    assert.deepEqual(q.options.filter(o => o.correct).map(o => o.letter), [correct[i]], where);
    assert.equal(q.marks, marks[i], where);
    assert.ok(q.tags.length >= 2, `${where} tags: ${q.tags}`);
    assert.ok(q.tags.includes("Understanding"), where);
    assert.match(q.stemHtml, /^<p>\S.*\S<\/p>$/, where);
    assert.equal(q.numbering, "ABCD", where);
    for (const o of q.options) assert.equal(o.html, o.html.trim(), `${where} option ${o.letter} untrimmed`);
  });
  // Q6 uses U+2082 as typed; its last option ends in <w:cr/>
  assert.ok(questions[5].stemHtml.includes("₂"));
  assert.ok(!/\s$/.test(questions[5].options[3].text));
});

test("mock-test.docx: Moodle XML", async () => {
  const data = fs.readFileSync(path.join(__dirname, "mock-test.docx"));
  const { questions } = await parseDocx(data, deps);
  const { xml, included, skipped } = buildMoodleXml(questions);
  assert.deepEqual(included, [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.deepEqual(skipped, []);

  const errors = [];
  const doc = new DOMParser({ onError: (level, msg) => errors.push(`${level}: ${msg}`) })
    .parseFromString(xml, "application/xml");
  assert.deepEqual(errors, []);
  assert.equal(doc.getElementsByTagName("category").length, 0);
  const qs = Array.from(doc.getElementsByTagName("question"));
  assert.equal(qs.length, 8);
  qs.forEach((q, i) => {
    assert.equal(q.getAttribute("type"), "multichoice");
    const answers = Array.from(q.getElementsByTagName("answer"));
    assert.equal(answers.length, 4);
    assert.equal(answers.filter(a => a.getAttribute("fraction") === "100").length, 1);
    assert.equal(q.getElementsByTagName("defaultgrade")[0].textContent, String(questions[i].marks));
    assert.equal(q.getElementsByTagName("single")[0].textContent, "true");
    const tags = Array.from(q.getElementsByTagName("tag")).map(t => t.textContent);
    assert.deepEqual(tags, questions[i].tags);
    assert.ok(q.getElementsByTagName("name")[0].textContent.trim().length > 0);
  });
});

test("mock-test.docx: Moodle XML with a category", async () => {
  const data = fs.readFileSync(path.join(__dirname, "mock-test.docx"));
  const { questions } = await parseDocx(data, deps);
  const { xml, included } = buildMoodleXml(questions, { category: "$course$/top/From MS Word" });
  assert.equal(included.length, 8);

  const errors = [];
  const doc = new DOMParser({ onError: (level, msg) => errors.push(`${level}: ${msg}`) })
    .parseFromString(xml, "application/xml");
  assert.deepEqual(errors, []);
  const qs = Array.from(doc.getElementsByTagName("question"));
  assert.equal(qs.length, 9);
  assert.equal(qs[0].getAttribute("type"), "category");
  assert.equal(qs[0].getElementsByTagName("category")[0].textContent.trim(), "$course$/top/From MS Word");
  assert.ok(qs.slice(1).every(q => q.getAttribute("type") === "multichoice"));
});

// ---- synthetic documents ----

const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ' +
  'xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"';

const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// run(text, {color, align, rStyle, rPr}); rPr is extra raw XML, e.g. "<w:b/>"
const run = (text, o = {}) => {
  const rPr = [
    o.rStyle ? `<w:rStyle w:val="${o.rStyle}"/>` : "",
    o.rPr || "",
    o.color ? `<w:color w:val="${o.color}"/>` : "",
    o.align ? `<w:vertAlign w:val="${o.align}"/>` : ""
  ].join("");
  return `<w:r>${rPr ? `<w:rPr>${rPr}</w:rPr>` : ""}<w:t xml:space="preserve">${esc(text)}</w:t></w:r>`;
};
// para(runs, {num: [numId, ilvl], style})
const para = (runs, o = {}) => {
  const pPr = (o.style ? `<w:pStyle w:val="${o.style}"/>` : "") +
    (o.num ? `<w:numPr><w:ilvl w:val="${o.num[1]}"/><w:numId w:val="${o.num[0]}"/></w:numPr>` : "");
  const body = Array.isArray(runs) ? runs.join("") : typeof runs === "string" ? (runs.startsWith("<w:") ? runs : run(runs)) : "";
  return `<w:p>${pPr ? `<w:pPr>${pPr}</w:pPr>` : ""}${body}</w:p>`;
};
const table = cells => {
  const rows = [];
  for (let i = 0; i < cells.length; i += 2) {
    rows.push(`<w:tr>${cells.slice(i, i + 2).map(c => `<w:tc>${para(c)}</w:tc>`).join("")}</w:tr>`);
  }
  return `<w:tbl>${rows.join("")}</w:tbl>`;
};
const meta = (marks = "1") => table([`Marks: ${marks}`, "Topic: Cells", "Task: Recall", "Bloom: Remembering"]);

// numId 1: decimal; numId 2: upperLetter; numId 3: lowerLetter; numId 4 → abstract 1 with level 0 overridden to upperLetter
const NUMBERING = `<w:numbering ${NS}>
  <w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:numFmt w:val="decimal"/></w:lvl></w:abstractNum>
  <w:abstractNum w:abstractNumId="1"><w:lvl w:ilvl="0"><w:numFmt w:val="upperLetter"/></w:lvl></w:abstractNum>
  <w:abstractNum w:abstractNumId="2"><w:lvl w:ilvl="0"><w:numFmt w:val="lowerLetter"/></w:lvl></w:abstractNum>
  <w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>
  <w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num>
  <w:num w:numId="3"><w:abstractNumId w:val="2"/></w:num>
  <w:num w:numId="4"><w:abstractNumId w:val="0"/>
    <w:lvlOverride w:ilvl="0"><w:lvl w:ilvl="0"><w:numFmt w:val="upperLetter"/></w:lvl></w:lvlOverride></w:num>
</w:numbering>`;

const STYLES = `<w:styles ${NS}>
  <w:style w:type="character" w:styleId="Answer"><w:rPr><w:color w:val="C00000"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="QBase"><w:pPr><w:numPr><w:numId w:val="1"/></w:numPr></w:pPr></w:style>
  <w:style w:type="paragraph" w:styleId="Question"><w:basedOn w:val="QBase"/></w:style>
  <w:style w:type="paragraph" w:styleId="RedPara"><w:rPr><w:color w:val="FF0000"/></w:rPr></w:style>
</w:styles>`;

async function docx(bodyXml) {
  const zip = new JSZip();
  zip.file("word/document.xml", `<w:document ${NS}><w:body>${bodyXml}<w:sectPr/></w:body></w:document>`);
  zip.file("word/numbering.xml", NUMBERING);
  zip.file("word/styles.xml", STYLES);
  return parseDocx(await zip.generateAsync({ type: "uint8array" }), deps);
}

const Q = [1, 0];
const OPT = [2, 0];
const codes = q => q.flags.map(f => f.code);

test("typed fallback, escaping, sub/superscript, line breaks", async () => {
  const { questions, notes } = await docx([
    para("Instructions"),
    para([run("1. Which is true of H"), run("2", { align: "subscript" }), run("O & x"),
      run("2", { align: "superscript" }), run(" < 3?"), "<w:r><w:br/></w:r>", run("Second line")]),
    para("A. one\tthing"),
    para(run("B) two", { color: "FF0000" })),
    para("c. three"),
    para(""),
    meta("2.5 marks")
  ].join(""));
  assert.equal(notes[0].code, "preamble-skipped");
  const [q] = questions;
  assert.deepEqual(q.flags, []);
  assert.equal(q.stemHtml, "<p>Which is true of H<sub>2</sub>O &amp; x<sup>2</sup> &lt; 3?<br>Second line</p>");
  assert.deepEqual(q.options.map(o => o.html), ["one thing", "two", "three"]);
  assert.deepEqual(q.options.map(o => o.correct), [false, true, false]);
  assert.equal(q.marks, 2.5);
  const { xml } = buildMoodleXml(questions);
  assert.ok(xml.includes("<![CDATA[<p>Which is true of H<sub>2</sub>O &amp; x"));
});

test("numbering: style numPr, lvlOverride, lowerLetter, red via styles", async () => {
  const { questions } = await docx([
    para("Stem one", { style: "Question" }),
    para("wrong", { num: [4, 0] }),
    para([run("right", { rStyle: "Answer" })], { num: [4, 0] }),
    meta(),
    para("Stem two", { num: Q }),
    para("Continued stem"),
    para("first", { num: [3, 0] }),
    para("second", { num: [3, 0], style: "RedPara" }),
    meta()
  ].join(""));
  assert.equal(questions.length, 2);
  assert.deepEqual(questions.map(codes), [[], []]);
  assert.deepEqual(questions[0].options.map(o => o.correct), [false, true]);
  assert.equal(questions[1].stemHtml, "<p>Stem two</p><p>Continued stem</p>");
  assert.deepEqual(questions[1].options.map(o => o.letter), ["A", "B"]);
  assert.equal(questions[1].numbering, "abc");
  assert.deepEqual(questions[1].options.map(o => o.correct), [false, true]);
});

test("red: 50% rule; orange and dark red-brown are not red", async () => {
  const { questions } = await docx([
    para("Stem", { num: Q }),
    para([run("half", { color: "FF0000" }), run("half")], { num: OPT }),
    para([run("orange", { color: "E97132" })], { num: OPT }),
    para([run("brown", { color: "994C00" })], { num: OPT }),
    para([run("mostly"), run("not", { color: "FF0000" })], { num: OPT }),
    meta()
  ].join(""));
  assert.deepEqual(questions[0].options.map(o => o.correct), [true, false, false, false]);
  assert.deepEqual(codes(questions[0]), []);
});

test("table: labels, Bloom's variants, tags, unknown label", async () => {
  const { questions } = await docx([
    para("Stem", { num: Q }),
    para(run("a", { color: "FF0000" }), { num: OPT }),
    para("b", { num: OPT }),
    table(["marks : 1 mark", "TOPIC:  Cell   biology ", "Task: cell biology", "Bloom’s: Applying", "Level: hard", "Blooms: x"])
  ].join(""));
  const [q] = questions;
  assert.equal(q.marks, 1);
  assert.deepEqual(q.tags, ["Cell biology", "x"]);
  assert.deepEqual(codes(q), ["unknown-label", "duplicate-label"]);
  assert.equal(q.excluded, false);
});

test("flags: no red, two red, one option, no table, bad marks, stray text, image", async () => {
  const red = t => para(run(t, { color: "FF0000" }), { num: OPT });
  const plain = t => para(t, { num: OPT });
  const { questions } = await docx([
    para("No red", { num: Q }), plain("a"), plain("b"), meta(),
    para("Two red", { num: Q }), red("a"), red("b"), meta(),
    para("One option", { num: Q }), red("a"), meta(),
    para("No table", { num: Q }), red("a"), plain("b"),
    para("Bad marks", { num: Q }), red("a"), plain("b"), meta("one"),
    para("Stray text", { num: Q }), red("a"), plain("b"), para("Note to self"), meta(),
    para("No options", { num: Q }), meta(),
    para("Image", { num: Q }), para('<w:r><w:drawing/></w:r>'), red("a"), plain("b"), meta(),
    para("Tag, comma", { num: Q }), red("a"), plain("b"), table(["Marks: 1", "Topic: a, b"])
  ].join(""));
  assert.deepEqual(questions.map(codes), [
    ["no-correct"],
    ["several-correct"],
    ["too-few-options"],
    ["no-table"],
    ["bad-marks"],
    ["text-before-table"],
    ["no-options"],
    ["image"],
    ["tag-comma"]
  ]);
  const { included, skipped } = buildMoodleXml(questions);
  assert.deepEqual(included, [6, 9]);
  assert.deepEqual(skipped, [1, 2, 3, 4, 5, 7, 8]);
});

test("bold: kept in stems and descriptions, not in options or terms; w:bCs alone ignored", async () => {
  const B = { rPr: "<w:b/>" };
  const { questions } = await docx([
    para([run("Which is "), run("NOT", B), run(" a "), run("cell", { rPr: "<w:bCs/>" }),
      run(" organelle", { rPr: '<w:b w:val="0"/>' }), run("?")], { num: Q }),
    para([run("Nucleus", B)], { num: OPT }),
    para([run("Wall", { color: "FF0000" })], { num: OPT }),
    meta(),
    para([run("Match the "), run("bold", B), "<w:r><w:br/></w:r>", run("parts", B)]),
    grid([HEADER, [[run("Powerhouse", B)], "A", [run("Mitochondrion", B)]], ["Control", "B", "Nucleus"]]),
    meta()
  ].join(""));
  const [mcq, match] = questions;
  assert.deepEqual(questions.map(codes), [[], []]);
  assert.equal(mcq.stemHtml, "<p>Which is <strong>NOT</strong> a cell organelle?</p>");
  assert.deepEqual(mcq.options.map(o => o.html), ["Nucleus", "Wall"]);
  assert.equal(match.stemHtml, "<p>Match the <strong>bold</strong><br><strong>parts</strong></p>");
  assert.deepEqual(match.pairs.map(p => [p.html, p.answer]), [["<p><strong>Powerhouse</strong></p>", "Mitochondrion"], ["<p>Control</p>", "Nucleus"]]);
  const { xml } = buildMoodleXml(questions);
  assert.ok(xml.includes("<![CDATA[<p>Which is <strong>NOT</strong>"));
  assert.ok(xml.includes("<text>Mitochondrion</text>"));
});

// ---- matching: mock-matching.docx ----

const xmlErrors = xml => {
  const errors = [];
  const doc = new DOMParser({ onError: (level, msg) => errors.push(`${level}: ${msg}`) })
    .parseFromString(xml, "application/xml");
  return { doc, errors };
};

test("mock-matching.docx: types, header skipped, pairs, distractors, marks, flags", async () => {
  const data = fs.readFileSync(path.join(__dirname, "mock-matching.docx"));
  const { questions, notes } = await parseDocx(data, deps);

  assert.deepEqual(questions.map(q => q.type), ["matching", "multichoice", "multichoice", "matching"]);
  assert.deepEqual(notes, []);
  assert.deepEqual(questions.map(q => q.marks), [4, 1, 1, 4]); // "4 marks", "1", "1", "4"
  assert.deepEqual(questions.map(q => q.excluded), [false, false, false, false]);
  assert.deepEqual(questions.map(codes), [["duplicate-term"], [], [], []]);
  assert.match(questions[0].flags[0].message, /Sino-Atrial Node/);

  // Header rows ("COLUMN A … ANSWER …", "Heart's structures | Answer | Changes") skipped
  const [q1, , , q4] = questions;
  assert.ok(q1.pairs.every(p => !/COLUMN|Description/.test(p.text)));
  assert.match(q1.stemText, /^Match the description in Column A/);
  assert.deepEqual(q1.pairs.map(p => p.answer),
    ["Autorhythmic fibres", "Sino-Atrial Node", "Action Potential", "Purkinje Fibers."]);
  assert.match(q1.pairs[0].text, /^Specialized cardiac muscle cells/);
  assert.match(q1.pairs[0].html, /^<p>Specialized.*<\/p>$/);
  assert.deepEqual(q1.extras, ["Cardiac conduction system", "Atrioventricular Node", "Sino-Atrial Node"]);

  assert.match(q4.stemText, /ventricular ejection\.$/);
  assert.equal(q4.stemHtml, "<p>Match the changes in the heart's structures (Open/close or Increase/decrease) " +
    "with what happens during <strong>ventricular ejection</strong>.</p>");
  // MCQ stems in the fixture carry w:bCs only, which is not bold
  assert.ok(!questions[1].stemHtml.includes("<strong>"));
  assert.deepEqual(q4.pairs.map(p => [p.text, p.answer]), [
    ["Volume", "Decrease"],
    ["Pressure", "Increase"],
    ["Atrioventricular valves (tricuspid and mitral)", "Close"],
    ["Semi-lunar valves (pulmonary and aortic)", "Open"]
  ]);
  assert.deepEqual(q4.extras, []);

  // The MCQs between them: stems use numId 1, like Column A, and are unaffected
  assert.deepEqual(questions[1].options.filter(o => o.correct).map(o => o.letter), ["A"]);
  assert.deepEqual(questions[2].options.filter(o => o.correct).map(o => o.letter), ["B"]);
});

test("mock-matching.docx: Moodle XML", async () => {
  const data = fs.readFileSync(path.join(__dirname, "mock-matching.docx"));
  const { questions } = await parseDocx(data, deps);
  const { xml, included } = buildMoodleXml(questions);
  assert.deepEqual(included, [1, 2, 3, 4]);

  const { doc, errors } = xmlErrors(xml);
  assert.deepEqual(errors, []);
  const qs = Array.from(doc.getElementsByTagName("question"));
  assert.deepEqual(qs.map(q => q.getAttribute("type")), ["matching", "multichoice", "multichoice", "matching"]);

  const subs = q => Array.from(q.getElementsByTagName("subquestion")).map(s => [
    s.getElementsByTagName("text")[0].textContent,
    s.getElementsByTagName("answer")[0].getElementsByTagName("text")[0].textContent
  ]);
  const s1 = subs(qs[0]);
  assert.equal(s1.length, 7);
  assert.deepEqual(s1.map(s => s[1]), ["Autorhythmic fibres", "Sino-Atrial Node", "Action Potential",
    "Purkinje Fibers.", "Cardiac conduction system", "Atrioventricular Node", "Sino-Atrial Node"]);
  assert.deepEqual(s1.map(s => s[0] === ""), [false, false, false, false, true, true, true]);
  assert.ok(s1[2][0].includes("neurons &amp; muscle cells"));
  assert.equal(subs(qs[3]).length, 4);

  for (const q of [qs[0], qs[3]]) {
    assert.equal(q.getElementsByTagName("defaultgrade")[0].textContent, "4");
    assert.equal(q.getElementsByTagName("shuffleanswers")[0].textContent, "0");
    assert.equal(q.getElementsByTagName("answernumbering").length, 0);
    for (const f of ["correctfeedback", "partiallycorrectfeedback", "incorrectfeedback"]) {
      assert.equal(q.getElementsByTagName(f)[0].textContent.trim(), "");
    }
  }
  assert.deepEqual(Array.from(qs[3].getElementsByTagName("tag")).map(t => t.textContent),
    ["Cardiac Cycle", "Phases", "Application"]);
});

// ---- matching: synthetic grids ----

// grid([[description, letter, term], …]); rows can be cell XML too
const grid = rows => {
  const cell = c => `<w:tc>${para(c)}</w:tc>`;
  const trs = rows.map(r => `<w:tr>${r.map(cell).join("")}</w:tr>`).join("");
  return `<w:tbl><w:tblGrid><w:gridCol/><w:gridCol/><w:gridCol/></w:tblGrid>${trs}</w:tbl>`;
};
const HEADER = ["Description", "Answer", "Term"];

test("matching: typed letter prefixes, numbered stem, escaping, sub/superscript", async () => {
  const { questions } = await docx([
    para("Match them", { num: Q }),
    grid([
      HEADER,
      [[run("H"), run("2", { align: "subscript" }), run("O")], "b", "A. Oxygen & co"],
      ["Salt", "A)", "B) <NaCl>"],
      ["", "", "C. Spare"]
    ]),
    meta("2 marks")
  ].join(""));
  const [q] = questions;
  assert.equal(q.type, "matching");
  assert.deepEqual(codes(q), []);
  assert.equal(q.marks, 2);
  assert.equal(q.stemHtml, "<p>Match them</p>");
  assert.deepEqual(q.pairs.map(p => [p.html, p.answer]), [["<p>H<sub>2</sub>O</p>", "<NaCl>"], ["<p>Salt</p>", "Oxygen & co"]]);
  assert.deepEqual(q.extras, ["Spare"]);
  const { xml } = buildMoodleXml(questions);
  assert.deepEqual(xmlErrors(xml).errors, []);
  assert.ok(xml.includes("<text>&lt;NaCl&gt;</text>"));
  assert.ok(xml.includes("<text>Oxygen &amp; co</text>"));
});

test("matching flags: letter out of range, empty letter, two letters, no description, too few pairs, same term", async () => {
  const two = [["one", "A", "Alpha"], ["two", "B", "Beta"]];
  const { questions } = await docx([
    para("Out of range"), grid([HEADER, ...two, ["three", "D", "Gamma"]]), meta(),
    para("Empty letter"), grid([HEADER, ...two, ["three", "", "Gamma"]]), meta(),
    para("Two letters"), grid([HEADER, ...two, ["three", "A, C", "Gamma"]]), meta(),
    para("No description"), grid([HEADER, ...two, ["", "C", "Gamma"]]), meta(),
    para("Too few"), grid([HEADER, ["one", "A", "Alpha"], ["", "", "Beta"]]), meta(),
    para("Same term"), grid([HEADER, ...two, ["three", "a", "Gamma"]]), meta(),
    grid([HEADER, ...two]), meta()
  ].join(""));
  assert.deepEqual(questions.map(codes), [
    ["letter-out-of-range"],
    ["no-letter"],
    ["several-letters"],
    ["no-description"],
    ["too-few-pairs"],
    ["same-term"],
    ["no-stem"]
  ]);
  assert.deepEqual(questions[5].extras, ["Gamma"]);
  const { included } = buildMoodleXml(questions);
  assert.deepEqual(included, [6]);
});

(async () => {
  let failed = 0;
  for (const t of tests) {
    try {
      await t.fn();
      console.log(`ok   ${t.name}`);
    } catch (e) {
      failed++;
      console.log(`FAIL ${t.name}\n     ${e.message.split("\n").join("\n     ")}`);
    }
  }
  console.log(`\n${tests.length - failed}/${tests.length} passed`);
  process.exitCode = failed ? 1 : 0;
})();
