# Spike: attach a generated XML file to Moodle's file picker

Question: can a content script attach a file to the question import page's
file picker on WiSeUp (Moodle 4.3.3+), in Chrome and in Firefox?

Code: `spikes/attach/` (throwaway; not part of `src/`).

## 1. Research: how Moodle 4.3 handles drag-and-drop on a filepicker

Sources read on `MOODLE_403_STABLE`: `lib/form/dndupload.js`,
`lib/form/filepicker.js`, `repository/repository_ajax.php`,
`repository/upload/lib.php`.

### Which element has the handlers

`M.form_filepicker.init` (lib/form/filepicker.js) calls
`M.form_dndupload.init` with `containerid: 'file_info_' + client_id`.
`init_events()` then binds `dragenter`, `dragleave`, `dragover` and `drop`
with `Y.on(type, fn, this.container)`:

- **Target: `#file_info_<client_id>`**, the `.filepicker-filelist` div. The
  `.dndupload-target` child (mentioned in CLAUDE.md) only gets bubbled
  events, so dispatching on the container itself is the direct route.
- `client_id` is in the inline `M.form_filepicker.init(Y, {...})` options
  (`6ad76a5a67f4c` in the fixture). It changes on every page load.
- There are also page-level handlers on `body` (`dragenter`, `dragleave`,
  `drop`). They only show or hide the "drop files here" highlight.

### When the handlers are not installed at all

`init()` returns without binding anything (and adds `body.dndnotsupported`)
if:

- `FileReader` or `FormData` is missing; or
- no repository with `type == "upload"` is in `options.repositories`. On
  WiSeUp this is id `4`.

Otherwise it adds `body.dndsupported`. The spike logs both classes.

### What the handlers check

- **All four handlers** go through `check_drag(e)`:
  - `is_disabled()`: rejects the drag if the container has an ancestor
    `.fitem.disabled`;
  - `has_files(e)`: `e._event.dataTransfer.types` must contain the string
    `"Files"` (`types` may be null; that is treated as an empty list);
  - if both pass: `preventDefault()` and `stopPropagation()`. So
    **`event.defaultPrevented === true` after dispatch means Moodle
    accepted the event**. The spike logs this.
- **No `isTrusted` check**, and no "enabled" flag beyond `.fitem.disabled`.
- `dragenter`/`dragleave` only keep an `entercount` and toggle the CSS
  classes `dndupload-ready` and `dndupload-over`. `dragover` only calls
  `check_drag`. **None of them sets state that `drop` needs**, so on paper
  a lone `drop` is enough. The spike sends all three anyway, in order.
- `drop`: reads `e._event.dataTransfer.files`. For a filepicker (no
  `filemanager`), if `files.length >= 1` it uploads **only `files[0]`**, with
  `currentfilecount: 0` and `currentfiles: []`.
- **Limits:**
  - **maxfiles:** the filepicker passes `maxfiles: -1` to dndupload (even
    though the picker's own options say `maxfiles: 1`), so there is no
    client-side file-count limit.
  - **maxbytes:** `file.size > maxbytes` (1 GB here) opens an error dialogue.
  - **areamaxbytes:** not passed, so that check is skipped.
  - **Name clashes:** none on the client (the `currentfiles` list is empty).
    The server renames on a clash; see below.

### The upload request

`XMLHttpRequest` `POST` to
`M.cfg.wwwroot + '/repository/repository_ajax.php?action=upload'`, body
`FormData` (multipart):

| Field | Value |
|---|---|
| `repo_upload_file` | the `File` (server uses its `name`) |
| `sesskey` | `M.cfg.sesskey` |
| `repo_id` | id of the `upload` repository |
| `itemid` | draft item id (`options.itemid`, same as `#id_newfile` value) |
| `author` | `options.author`, only if set |
| `savepath` | `/` (filepickers have no folders) |
| `title` | file name |
| `overwrite` | `1`, only when overwriting (never on a first upload) |
| `ctx_id` | `options.context.id`, only if set |
| `accepted_types[]` | one per accepted type. **None is sent here**, because the page has `accepted_types: []`. The server then defaults to `*`. |

The server side (`repository_ajax.php`, upload repository) does the
following:

- **Checks:**
  - `require_login` on `ctx_id`;
  - rejects an empty `$_POST`;
  - `confirm_sesskey()`;
  - antivirus scan;
  - the MIME type against `accepted_types`;
  - draft-area limits.
- **Responses:**
  - on an error: JSON `{"error": "…"}`;
  - on success: JSON with `url`, `id` (the itemid) and `file`;
  - if a file of that name is already in the draft area: an
    `event: "fileexists"` response, and the file is stored under a new name
    (e.g. `spike-test (1).xml`). **Reload the page between attempts.**
- **Picker refresh:** on success dndupload calls
  `M.form_filepicker.callback`. This writes the file link into
  `#file_info_<client_id> .filepicker-filename`, marks the picker as
  `fileadded` and simulates a `change` on `#id_newfile`.
  **Method B skips this callback.** As a result, the picker shows no file,
  and Moodle's client-side "required" check on the file field may block
  Import even though the draft file exists. In the MAIN world the spike
  calls `M.form_filepicker.callback` itself after B, to see if that is
  enough.

### Other facts that matter

- The page's "Get category from file" and "Get context from file" are
  ticked by default. The spike XML has no `<category>`, so the selected
  category should be used. This is confirmed by test step 12.
- `"world": "MAIN"` in `content_scripts` needs Chrome 111+ and Firefox 128+
  (the manifest sets `strict_min_version` 128.0).
- In the ISOLATED world the page's `M` object is not visible. The spike
  therefore reads everything from the DOM and the inline scripts in both
  worlds. Moodle's own XHR response can only be logged in MAIN (via an XHR
  wrapper). In ISOLATED, the spike logs the request from resource timing,
  plus the picker filename change and any Moodle error dialogue.

## 2. What the spike does

`spikes/attach/manifest.json` + `spikes/attach/spike.js`. The content script
runs only on `https://wiseup.wsu.ac.za/question/bank/importquestions/import.php*`
and adds two buttons at the bottom left. Each button's label shows the
world it runs in.

- **Spike: attach** (method A):
  1. ticks `#id_format_xml` and dispatches `change`;
  2. waits for `#filepicker-wrapper-<client_id>` to be visible;
  3. builds `spike-test.xml` (`text/xml`) with two dummy MCQs (`SPIKE 1…`,
     default mark 2; `SPIKE 2…`, default mark 1; three tags each,
     including one with spaces; no category);
  4. dispatches `dragenter` → `dragover` → `drop` with a `DataTransfer` on
     `#file_info_<client_id>`.
- **Spike: upload B**: parses `repo_id`, `itemid`, `sesskey`, `ctx_id`,
  `author` and `accepted_types` from the page, then POSTs the request above
  with `fetch`.

The spike never clicks Import or submits the form. It logs with the prefix
`[spike]`; the sesskey is masked and the author is logged only as
present/absent.

To switch worlds, change one line in `manifest.json`:
`"world": "ISOLATED"` ↔ `"world": "MAIN"`.

## 3. Test checklist

Use a sandbox course only.

1. **Chrome, load:** in WSL run
   `mkdir -p /mnt/c/Users/drjua/wale-ext-spike && cp -r ~/wsuMoodleAddon/spikes/attach/. /mnt/c/Users/drjua/wale-ext-spike/`.
   Then go to `chrome://extensions` → Developer mode → Load unpacked →
   `C:\Users\drjua\wale-ext-spike`.
2. **Firefox, load:** go to `about:debugging#/runtime/this-firefox` → Load
   Temporary Add-on → `C:\Users\drjua\wale-ext-spike\manifest.json`. In
   `about:addons` → the spike → Permissions, check that access to
   `wiseup.wsu.ac.za` is allowed (MV3 host permissions can be off by
   default).
3. Open the sandbox course's question bank → **Import**. Open DevTools:
   Console filtered on `[spike]`, Network filtered on `repository_ajax`.
   Check that the console shows `loaded; world=…` and the two buttons show
   the expected world.
4. **A:** reload the page (fresh draft area), then click **Spike: attach**.
   Look for:
   - `defaultPrevented=true` on `dragenter`, `dragover` and `drop`;
   - a `repository_ajax.php?action=upload` POST in Network whose Response
     is JSON with `url`, `id` and `file` and **no `error`**;
   - **`spike-test.xml` shown as a link in the picker**, and the console
     line `picker filename now: "spike-test.xml"`.
5. Copy the `[spike]` console lines into the Notes column (or send them to
   me).
6. **B:** reload the page, then click **Spike: upload B**. Look for:
   - `parsed: repo_id=4 …` with no missing values;
   - `HTTP 200` and a JSON response with no `error`;
   - the picker will **not** show the file in ISOLATED. In MAIN it should,
     after the callback line.
7. **A-MAIN / B-MAIN:** change `"world"` to `"MAIN"` in `manifest.json`,
   re-copy to Windows for Chrome, then reload the extension
   (`chrome://extensions` ↻ / `about:debugging` Reload). Hard-reload the
   page and repeat steps 4–6. The console line `page M visible=true`
   confirms MAIN.
8. Repeat steps 3–7 in Firefox.
9. **Import (once per browser, after a successful A):** expand **General**,
   choose a sandbox category in **Import category**, and leave the other
   settings as they are.
10. Click **Import** yourself. The next page should list 2 questions;
    click **Continue**.
11. In the question bank (that category) check:
    - `SPIKE 1 primary colour` (default mark 2; answer `Green` correct;
      `Black & white` shown correctly);
    - `SPIKE 2 days in a week` (default mark 1; answer `7` correct);
    - tags `spike-test`, `Dummy topic A`, `Understanding` /
      `spike-test`, `Dummy task B`, `Remembering`.
12. Confirm that the questions landed in the category you selected (not a
    new one). Then delete both SPIKE questions.
13. Optional: after a B run in ISOLATED, try Import to see whether the
    form refuses it ("Required") because the picker was never told about
    the file.

## 4. Results

Fill in ✅ / ❌ / – and paste key `[spike]` lines into Notes.

| Browser | Variant | File shown in picker | Upload OK | Import OK | Notes |
|---|---|---|---|---|---|
| Chrome | A (isolated) | | | | |
| Chrome | A-MAIN | | | | |
| Chrome | B | | | | |
| Firefox | A (isolated) | | | | |
| Firefox | A-MAIN | | | | |
| Firefox | B | | | | |

Browser versions tested: Chrome ______ · Firefox ______
