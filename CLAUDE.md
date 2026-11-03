# wsuMoodleAddon

Manifest V3 browser extension (Chrome + Firefox) for WiSeUp, the Moodle 4.3 of IWS (iYunivesithi Walter Sisulu). Hides the "Chat to Wale" widget, cleans Word pastes into TinyMCE, imports single-answer MCQs, matching and essay questions from .docx into the question bank, and shows all questions on one page in the quiz "from question bank" modal.

Display name: "WiSeUp Toolkit". The repo, package name (wsu-moodle-addon), gecko id, storage keys and code identifiers keep "wsu"; do not rename them.

Next planned work:
- Short answer questions, on branch `feature/short-answer`.
- Question names should come from the stem, not the scenario lead-in.
- Consider a warning when an MCQ's options lost their numbering and it became an essay.

## Rules
- Exam content never leaves the browser: no network calls, LLMs, CDNs, remote code or eval. Bundle libraries locally; ask before adding any dependency.
- Git is read-only: only status, log, diff, show, blame, ls-files. When work is ready, list the changed files and suggest a commit message; I commit.
- Move or delete files with plain mv/rm, never git mv/rm.
- Real exam items, sesskeys, names and real category names go only in test/private/ (git-ignored), never in tracked files.
- The add-on leaves no visible trace on the page apart from what each feature needs.
- UK English in code comments, UI text and docs.

## Dev loop
After changes run
`cp -r ~/wsuMoodleAddon/src/. "/mnt/c/Users/drjua/OneDrive - Walter Sisulu University/Dev/Extensions/WiSeUp Toolkit/"`
then reload the extension in Chrome (chrome://extensions, ↻).

## Show all questions (quiz question bank modal)
- src/qbank/qbank-showall.js (MAIN world, document_start, quiz edit.php) wraps XHR/fetch and sets qperpage=1000 (and qpage 0) in core_get_fragment calls: mod_quiz `quiz_question_bank` (inside the querystring arg) and `question_data` (separate args). Captured payloads: test/test/qbank-fragment-payloads.txt.
- Moodle 4.3 honours qperpage in both; custom_view's DEFAULT_PAGE_SIZE (20) is only a default. The pager hides itself when everything fits, so no CSS.
- Switch: storage key `showAllQuestions` (default on). content.js mirrors it to `<html data-wiseup-showall="on|off">` on edit.php only; the MAIN script reads it per request.
- Debug logging sits behind `DEBUG` (false). Never log the sesskey or full service.php URLs.
- Counter: src/qbank/qbank-counter.js (ISOLATED, document_idle) puts "N questions listed · M selected" just before `#categoryquestions`, inside div#question_table, as a Bootstrap `sticky-top bg-white` div (the only overflow rule is on the table itself, so sticky works); same showAllQuestions switch. Rows = `#categoryquestions tbody` checkboxes with data-toggle="slave" data-togglegroup="qbank"; select-all is #qbheadercheckbox (master). A MutationObserver catches re-renders; select-all sets .checked without events, so clicks/changes recount after a tick. Real modal HTML: test/private/qbank-modal.html.

## Read when relevant
- Importer spec (before any importer work): docs/importer-spec.md
- .docx structure findings: docs/findings-docx.md
- Fixtures and redactions: test/FIXTURES.md