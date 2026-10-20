# Importer spec (living document)

## Scope
- Input: .docx only. PDF is not supported in v1 (text extraction loses font colour).
- Question types: single-answer MCQ now; matching next. Anything else is listed in the preview as "unsupported type" and excluded from the XML.
- No question editor. No category in the XML; the lecturer's selection on the import page is used.

## Reading the .docx
JSZip + DOMParser on word/document.xml, numbering.xml and styles.xml. Not mammoth.js, which drops font colour.

## Classifying paragraphs
- Resolve numbering format: w:numPr (numId, ilvl) → w:num (apply w:lvlOverride) → w:abstractNum → w:lvl[ilvl] → w:numFmt. Also check numPr inherited from the paragraph style.
- decimal → question start. upperLetter/lowerLetter → option. Never use ilvl to tell them apart: options are often a separate level-0 list per question.
- Typed fallback: `\d+[.)]` → question; `[A-Ha-h][.)]` → option.
- Option letters are positional, never read from the document.

## Segmenting a question
- From a question start to the next question start.
- Stem = question paragraph plus following non-empty, non-numbered paragraphs before the first option.
- Options = consecutive option paragraphs.
- Metadata = first w:tbl after the options.
- Empty paragraphs ignored. Content before question 1 is skipped and reported as "preamble skipped".

## Text
- Join w:t across runs.
- w:tab, w:cr and non-page w:br → space in options, line break in stems. Ignore w:lastRenderedPageBreak and page breaks.
- vertAlign subscript/superscript → `<sub>`/`<sup>`. Keep Unicode sub/superscripts as typed.
- HTML-escape `<`, `>`, `&`.
- Images (w:drawing, w:pict) or equations (m:oMath) in a question → flag and exclude in v1.

## Correct answer
- Run colour w:color/@w:val; fall back to character style, then paragraph style. Ignore the paragraph-mark rPr.
- Red = R ≥ 0x99, G ≤ 0x40, B ≤ 0x40 (catches FF0000 and C00000; excludes orange E97132, auto, black).
- An option is correct if ≥ 50% of its characters are red. Exactly one correct option required.

## Metadata table
- Cell text = runs joined, split at the first `:`; label trimmed and matched case-insensitively. Never rely on bold.
- Normalise Bloom's / Bloom’s / Blooms → Bloom.
- Marks → numeric default mark (accept `1`, `2.5`, `1 mark`).
- Topic, Task, Bloom values → bare tags: trim, collapse whitespace, de-duplicate case-insensitively.

## Preview flags
- Zero or several red options; fewer than two options.
- Missing table or missing/non-numeric Marks.
- Tag value with a comma or longer than ~50 characters.
- Unknown table label.
- "Question" with no options; image or equation; unsupported type.
- Non-empty paragraph between the last option and the table.

## Moodle import page (WiSeUp, Moodle 4.3.3+)
- Detect by body#page-question-bank-importquestions-import. The form id is randomised per load.
- Format: tick #id_format_xml; nothing is pre-selected.
- File picker: hidden #id_newfile holds the draft item id. Drag-and-drop handlers are bound to #file_info_<client_id>; client_id changes per load and is in the inline M.form_filepicker.init(...) options. `.dndupload-target` is only the visual highlight.
- Handlers exist only if the body has the class dndsupported. Moodle calling preventDefault() on drop means the drop was accepted.
- Attach method: two content scripts. importer.js (isolated world) does all the work; dropper.js (main world) receives the XML and dispatches dragenter/dragover/drop on #file_info_<client_id>. Tested working in Chrome and Firefox (isolated-world drop fails in Firefox). Minimum: Chrome 111, Firefox 128.
- The extension ticks Moodle XML and attaches the file, then stops. The lecturer clicks Import.