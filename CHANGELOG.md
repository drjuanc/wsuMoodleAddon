# Changelog

## 2.2 — 20 October 2026
- New: the Word importer also imports essay questions: a numbered question
  with no lettered options. The red memo after it goes into Moodle's
  information for graders, keeping bullet lists and tables. An answer
  table goes into the students' answer box with the red answers left empty.
- A "Scenario: …" paragraph directly above a question is put in front of
  it, for every question type. Text above question 1 is ignored, with a note.
- SubT and Module in the metadata table become tags; 3×2 tables are fine.
- A three-column table counts as a matching grid only if it has answer
  letters in the middle column.
- Warnings for stray red text after a metadata table and for essays that
  look like MCQs with typed options.

## 2.1 — 20 October 2026
- New: the Word importer also imports matching questions, written as a
  three-column table (description, answer letter, term) after the question
  text. Extra terms become distractors; the preview flags missing, extra or
  out-of-range letters.
- Bold in question text and matching descriptions is kept.
- Clearer preview: a header row, a Type and a Marks column, and the question
  text shown with its bold, sub/superscript and line breaks. Matching
  questions list the numbered descriptions beside their terms, then the
  distractors.

## 2.0 — WiSeUp Toolkit
- New name: WiSeUp Toolkit (was WSU Moodle Helper). The university is now
  named iYunivesithi Walter Sisulu (IWS).
- New: import multiple-choice questions from a Word document (.docx) on the
  question bank's Import page. Preview with right answer, tags and reasons
  for leaving a question out; one click attaches the file and imports it,
  by default into the category "From MS Word". Everything runs in the
  browser.
- New popup switch, "Import questions from Word", on by default.
- Requires Chrome 121 or later, or Firefox 128 or later. The README now
  explains how to load it in Firefox.

## 1.4
- Cleans text pasted from MS Word into Moodle editors, with its own switch.
- Embeds a single picture pasted with Word text; removes Word's automatic
  question numbers and option letters.

## 1.3
- Hides only the "Chat to Wale" widget (#wsu-chat-root), so Moodle's own
  dialogs are no longer hidden.
- Toolbar icon switches the extension on and off and shows its state.
