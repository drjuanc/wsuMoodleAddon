# Importer spec (living document)

## Scope
- Input: .docx only. PDF is not supported (text extraction loses font colour).
- Question types: single-answer MCQ, matching and essay. Anything else is listed in the preview as "unsupported type" and excluded from the XML.
- No question editor.
- Category: by default the XML puts the questions in "From MS Word" under the course's top category (see "Moodle import page"). The lecturer can untick this to use the category selected on the import page.

## Reading the .docx
JSZip + DOMParser on word/document.xml, numbering.xml and styles.xml. Not mammoth.js, which drops font colour.

## Classifying paragraphs
- Resolve numbering format: w:numPr (numId, ilvl) → w:num (apply w:lvlOverride) → w:abstractNum → w:lvl[ilvl] → w:numFmt. Also check numPr inherited from the paragraph style.
- decimal → question start. upperLetter/lowerLetter → option. Never use ilvl to tell them apart: options are often a separate level-0 list per question.
- Typed fallback: `\d+[.)]` → question; `[A-Ha-h][.)]` → option.
- Option letters are positional, never read from the document.

## Segmenting a question
- From a question start to the next question start.
- Stem = lead-in (see below), question paragraph, plus following non-empty, non-numbered, non-red paragraphs before the first option.
- Options = consecutive option paragraphs.
- Metadata = first w:tbl after the options.
- Empty paragraphs ignored.
- **Lead-in (all question types):** the non-empty, unnumbered paragraph(s) directly before a stem, with no empty paragraph or table in between, go in front of the stem (e.g. "Scenario: …"). Red paragraphs are never a lead-in (see "Stray red text").
- **Before question 1** a lead-in is taken only from the last paragraph that starts with "Scenario" or "Case" (any case, colon optional, bold or not). Every other non-empty paragraph before question 1 is ignored, with the info note "N lines before the first question ignored".

## Text
- Join w:t across runs.
- w:tab, w:cr and non-page w:br → space in options, line break in stems. Ignore w:lastRenderedPageBreak and page breaks.
- vertAlign subscript/superscript → `<sub>`/`<sup>`. Keep Unicode sub/superscripts as typed.
- Direct run bold (w:b, not w:val 0/false/off) → `<strong>` in stems and matching descriptions only; never in MCQ options or matching terms. w:bCs on its own is ignored (not visibly bold).
- HTML-escape `<`, `>`, `&`.
- Images (w:drawing, w:pict) or equations (m:oMath) in a question → flag and exclude (not supported yet).

## Correct answer
- Run colour w:color/@w:val; fall back to character style, then paragraph style. Ignore the paragraph-mark rPr.
- Red = R ≥ 0x99, G ≤ 0x40, B ≤ 0x40 (catches FF0000 and C00000; excludes orange E97132, auto, black).
- An option is correct if ≥ 50% of its characters are red. Exactly one correct option required.

## Metadata table
- Cell text = runs joined, split at the first `:`; label trimmed and matched case-insensitively. Never rely on bold.
- Normalise Bloom's / Bloom’s / Blooms → Bloom.
- Marks → numeric default mark (accept `1`, `2.5`, `1 mark`).
- Topic, Task, Bloom, SubT and Module values → bare tags: trim, collapse whitespace, de-duplicate case-insensitively. A value with no letter or digit (e.g. "-") is not a tag.
- 2×2 and 3×2 tables are both fine. Colons and spaces may sit inside or outside the bold label, as the runs are joined first.

## Preview flags
- Zero or several red options; fewer than two options.
- Missing table or missing/non-numeric Marks.
- Tag value with a comma or longer than ~50 characters.
- Unknown table label.
- Image or equation; unsupported type.
- Non-empty paragraph between the last option and the table.

## Preview table
- Columns: #, Type, Question, Options, Answer, Marks, Tags, Notes. Fixed layout; Question takes the remaining width, #, Type and Marks stay narrow; scrolls sideways below about 56rem.
- Question: the stem only, from the same stemHtml as the XML, copied element by element from an inert DOMParser parse (p, strong/b, em/i, br, sub, sup); never innerHTML.
- MCQ: options as `A. text`; Answer is the right letter; Tags joined with `; `.
- Matching: one table row per pair, the other cells spanning them, so description n sits beside its term. Options: `1.`, `2.`… (kept on one line, at least 2em wide) and the description HTML; Answer: `1 → term`. Distractors follow in a last row under a small "Extra:" label.
- Essay: Options empty; Answer shows the memo as safe HTML like the stem (also ul/ol/li and table/tbody/tr/td, no attributes), or a small grey "No memo". The Question column shows the blank answer table below the stem, under a small grey "Response template:". Answer tables take the full column width, break only between words and scroll sideways if they do not fit.
- Excluded questions are greyed out with the reasons in Notes; warnings are listed there too.

## Matching questions
- **Detection:** a body-level table with 3 columns (w:tblGrid, else the widest row) between the stem and the Marks table makes a matching question, provided at least one row has a single letter (`A`, `b.`, `C)`) in its middle cell. Otherwise it is not a grid (in an essay it is an answer table).
- **Stem:** the non-empty paragraph(s) before the grid, numbered or not: either a numbered question start with no options yet, or the unnumbered paragraphs since the previous metadata table (or the start of the document). No stem → flag and exclude.
- **Table cells are never classified.** Paragraphs inside w:tc are never question starts or MCQ options. In the fixture, Column A uses decimal numId 1, the same list as MCQ stems.
- **Header row:** skip the first row if its middle cell is not a single letter. Never rely on header wording.
- **Rows:** Column A = description, middle = answer letter, Column B = term.
- **Letter → term by position** in Column B: count the non-empty Column B cells, A = 1st, B = 2nd… (case-insensitive; a trailing `.` or `)` is allowed). A typed prefix in Column B (`A. Term`, `A) Term`) is stripped from the term, as in the MCQ typed fallback; the mapping stays positional.
- **Red is not required** on the answer letter.
- **Distractors:** Column B terms that no letter points to become extra answers (subquestion with empty text).
- **Descriptions** keep the same formatting as MCQ stems (bold, sub/superscript, line breaks). **Terms** are plain text.
- **Marks:** as for MCQs (`4` and `4 marks` both give 4).
- **Flags** (blocking unless marked as a warning):
  - letter beyond the end of Column B;
  - more than one letter in a cell, or an answer that is not a letter;
  - description with no letter;
  - letter with no description;
  - fewer than 2 pairs;
  - duplicate Column B terms (warning: Moodle merges identical choices);
  - two descriptions pointing at the same term (warning);
  - non-empty paragraph between the grid and the metadata table (warning).
- **No shuffling,** as for MCQs.

## Essay questions
- **Detection:** a numbered stem with no lettered options (numFmt upperLetter/lowerLetter, or the typed fallback) and no matching grid before its metadata table is an essay. Bullet lists are not options.
- **Memo:** red paragraphs between the stem and the metadata table → Moodle `graderinfo` (HTML). Red as for MCQ options: run colour only (≥ 50% of the non-space characters), so red paragraph marks and space-only red runs do not count; EE0000 is red. Bullet paragraphs (numFmt bullet) become `<ul><li>`; other paragraphs `<p>`, with bold and sub/superscript as in stems. Leading and trailing spaces are dropped.
- **No memo** is fine (empty graderinfo, no flag).
- **Text after the memo** that is not red is left out (warning).
- **Answer table:** a table after the stem that is neither a grid nor a metadata table (no known `Label:` cell). It is left out of the question text, which is the stem only. The response template gets the table with its red runs removed (cells left empty, headers and black text kept, `border="1"`); graderinfo gets the full table, together with any red memo paragraphs. A table with no red text still goes to the response template, and nothing from it to graderinfo.
- **Stem** keeps its "(n marks)"; marks come from the table.
- **Stray red text** between a metadata table and the next lead-in or stem (e.g. a reviewer's note) is ignored, with a warning on the question before it.
- **Warnings:**
  - two or more lines of the stem or memo that look like typed options ("A. …", "B) …"): "Looks like an MCQ with unnumbered options";
  - in an MCQ, red text between the stem and the options is left out: "Red text before the options".

## Moodle XML
- Questions with a blocking flag, or of an unsupported type, are left out.
- Name = stem text, cut at a word boundary to about 80 characters.
- multichoice, single answer: right option fraction 100, others 0; default mark from Marks; penalty 0.3333333; answers not shuffled (Word fixes the order and options may refer to each other); numbering abc if every option letter is lower case, otherwise ABCD; no standard instruction; empty feedback.
- matching: default mark from Marks; penalty 0.3333333; shuffleanswers 0; empty feedback; one `<subquestion format="html">` per pair (description as HTML in `<text>`, term as escaped plain text in `<answer><text>`), then one with empty `<text>` per distractor.
- essay: default mark from Marks; penalty 0; responseformat editor; responserequired 1; responsefieldlines 10; attachments 0; attachmentsrequired 0; graderinfo (html) = the memo, or empty; responsetemplate (html) = the blank answer table(s), or empty; empty generalfeedback.
- Tags from the metadata table.
- Optional category question first (see below).

## Moodle import page (WiSeUp, Moodle 4.3.3+)
- Detect by body#page-question-bank-importquestions-import. The form id is randomised per load.
- Format: tick #id_format_xml; nothing is pre-selected.
- File picker: hidden #id_newfile holds the draft item id. Drag-and-drop handlers are bound to #file_info_<client_id>; client_id changes per load and is in the inline M.form_filepicker.init(...) options. `.dndupload-target` is only the visual highlight.
- Handlers exist only if the body has the class dndsupported. Moodle calling preventDefault() on drop means the drop was accepted.
- Attach method: two content scripts. importer.js (isolated world) does all the work; dropper.js (main world) receives the XML and dispatches dragenter/dragover/drop on #file_info_<client_id>. Tested working in Chrome and Firefox (isolated-world drop fails in Firefox). Main-world content scripts need Chrome 111 and Firefox 128; the manifest requires Chrome 121 and Firefox 128.
- Before a .docx is parsed, the box shows only its heading and the file chooser. The button and checkbox appear with the preview.
- While the preview is shown, Moodle's file row (#fitem_id_newfile) and Import button row (#fitem_id_submitbutton) get display:none. They are never removed: dropper.js drops onto the picker and the submit clicks #id_submitbutton. They are shown again if parsing fails, if the attach fails, if Moodle's form validation blocks the submit, if another file is chosen, or if the importer switch is turned off.
- dropper.js must not test the picker's visibility with offsetParent, which is null while its row is hidden.
- Next to the import button, a checkbox (ticked by default): "Import questions into the category 'From MS Word'".
  - Ticked: the XML starts with a category question, path `$course$/top/From MS Word`, and the extension ticks Moodle's "Get category from file" (#id_catfromfile) and "Get context from file" (#id_contextfromfile).
  - Unticked: no category in the XML; Moodle's selected category (#id_category) is used. "Questions will go to: <selected category name>" is shown next to the checkbox and follows changes to #id_category.
- Button: "Import N questions", N = questions that will be in the XML (the category question is not counted). Disabled if N is 0.
- One click attaches and submits:
  1. Disable the button, file input and checkbox (no double clicks).
  2. Tick Moodle XML format (#id_format_xml).
  3. Attach the file via dropper.js.
  4. Wait until the file name shows in the picker.
  5. Click Moodle's Import button (#id_submitbutton).
- If the attach fails or times out, show the error, re-enable the controls and do not submit. The button stays visible throughout; it is never hidden after attaching.
