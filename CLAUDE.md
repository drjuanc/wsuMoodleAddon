# wsuMoodleAddon

Manifest V3 browser extension (Chrome + Firefox) for WiSeUp, the Moodle 4.3 of IWS (iYunivesithi Walter Sisulu). Hides the "Chat to Wale" widget, cleans Word pastes into TinyMCE, and imports single-answer MCQs and matching questions from .docx into the question bank.

Display name: "WiSeUp Toolkit". The repo, package name (wsu-moodle-addon), gecko id, storage keys and code identifiers keep "wsu"; do not rename them.

Next planned work: short answer questions, on branch `feature/short-answer`.

## Rules
- Exam content never leaves the browser: no network calls, LLMs, CDNs, remote code or eval. Bundle libraries locally; ask before adding any dependency.
- Git is read-only: only status, log, diff, show, blame, ls-files. When work is ready, list the changed files and suggest a commit message; I commit.
- Move or delete files with plain mv/rm, never git mv/rm.
- Real exam items, sesskeys, names and real category names go only in test/private/ (git-ignored), never in tracked files.
- The add-on leaves no visible trace on the page apart from what each feature needs.
- UK English in code comments, UI text and docs.

## Dev loop
Copy src/ to /mnt/c/Users/drjua/wsuMoodleAddon-dev/, then reload the extension in chrome://extensions.

## Read when relevant
- Importer spec (before any importer work): docs/importer-spec.md
- .docx structure findings: docs/findings-docx.md
- Fixtures and redactions: test/FIXTURES.md