# Test fixtures

Raw, unredacted captures live in `test/private/`, which is git-ignored. Only
the sanitised versions described here may be committed.

## `import-page.html`

- **Source:** WiSeUp question bank import page,
  `/question/bank/importquestions/import.php?courseid=…`, saved from the
  browser while logged in as a lecturer. Original: `test/private/import-page.html`.
- **Captured:** 20 October 2026.
- **Moodle:** 4.3.3+ (`2023100903.06`), theme `wsu`.
- **Redacted / removed:**
  - every `sesskey` value → `XXXXXXXXXX` (the capture already had them
    hand-masked as `sssss…`; they are now uniform);
  - the lecturer's name → `Test Lecturer` (filepicker `"author"`), and the
    initials in the user menu are removed with the navbar;
  - user id `41057` → removed (all 12 occurrences were inside the removed
    markup below, so no `00000` substitution was needed);
  - course full name in the page header → `TEST COURSE`;
  - `#id_category` options → three fake options in an optgroup
    `Course: TEST101`, with values `1001,1105074`, `1002,1105074`,
    `1003,1105074`. The `catid,contextid` pattern and the page's real
    context id are kept so they stay consistent with `M.cfg` and the
    file picker;
  - removed markup: the navbar (primary navigation, notifications popover,
    message-drawer toggle, user menu, edit-mode switch), the Boost drawers
    (primary, course index, blocks), the secondary navigation, the message
    drawer, and the footer's "logged in as", data-retention and mobile-app
    links. Each is replaced by an `<!-- sanitised: … -->` comment.
- **Kept:** the full import form (format radios incl. `#id_format_xml`, the
  General section with `#id_category`, `#id_catfromfile`/`#id_contextfromfile`
  checked by default, the file picker with `#id_newfile` and
  `.dndupload-target`), `M.cfg`, `YUI_config`, the RequireJS config, the
  `M.form_filepicker.init(...)` call and the chat-widget `embed.js` tag.
- **Not redacted (know before publishing):** course id `139588`, course
  context id `1105074`, course category id `102` (body class), draft item id
  `492111000`, and the inline JavaScript that initialises the removed
  elements (it now finds nothing to bind to). None of these is personal, but
  they identify the course on WiSeUp.

## `mock-test.docx`

- **Source:** mock MCQ test written in Microsoft Word (16.0) in the planned
  input format. Structure analysis: `docs/findings-docx.md`.
- **Captured:** 20 October 2026.
- **Moodle:** n/a (input document); its target is Moodle 4.3.3+.
- **Redacted:** personal metadata removed with Word's Document Inspector
  (`dc:creator` and `cp:lastModifiedBy` in `docProps/core.xml` are empty).
- **Status:** committed. Dummy items (no real exam content), safe to
  publish.

## `paste-test.html`

Already committed before this file existed (v1.4 paste cleaner). Not
reviewed in this pass.
