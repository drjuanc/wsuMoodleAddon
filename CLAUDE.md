# wsuMoodleAddon

"WSU Moodle Helper": a Chrome (Manifest V3) extension for WSU Moodle with two
independent features, each switched on or off from the toolbar popup:
1. Hide the floating "Chat to Wale" widget.
2. Clean HTML pasted from MS Word into Moodle's rich-text editors on
   `wiseup.wsu.ac.za`.

## Layout
- `src/manifest.json` — manifest. Two content-script entries:
  - `content.js` on `*.wsu.ac.za`, top frame only, `document_start`.
  - `paste-clean.js` on `wiseup.wsu.ac.za` only, `all_frames` +
    `match_origin_as_fallback` so it also runs in TinyMCE's
    `about:blank`/`srcdoc` editor iframe.
- `src/content.js` — chat hider. Injects a single CSS rule hiding
  `#wsu-chat-root` while `hideChat` is on and removes it when off. Listens to
  `chrome.storage.onChanged` so all open Moodle tabs update instantly. No DOM
  scanning or observers.
- `src/paste-clean.js` — paste cleaner. Capture-phase `paste` listener on
  `document` (TinyMCE iframe body and Atto contenteditable divs). Ignores
  anything that is not `isContentEditable` (so `<input>`/`<textarea>` are left
  alone). Image passthrough (`isImagePaste`): if the clipboard holds an
  image file (`image/*` in `clipboardData.items`/`files`) AND either there is
  no `text/html` and only blank `text/plain`, OR the `text/html` contains an
  `<img>`, it returns without `preventDefault` and the editor handles the
  paste (screenshots, pictures copied from Word). An image file alongside
  text-only HTML is Word's rendered picture of the copied text: it is
  ignored and the text is cleaned. Otherwise it cleans
  `text/html` (falling back to `text/plain`), calls `preventDefault()` +
  `stopImmediatePropagation()` and inserts with `execCommand("insertHTML")`
  in the target's own document.
  - Top-frame fallback: an editor that rewrites its iframe with
    `document.open()` wipes listeners added at `document_start`. On window
    `blur` (focus moving into an iframe) the top frame attaches the same
    listener to the focused same-origin iframe's document. Double listeners
    are harmless: re-adding the same function is a no-op, and the handler
    returns early if `e.defaultPrevented` (another copy got there first).
  - When the script is loaded outside the extension (no `chrome.storage`), it
    only exposes `window.WsuPasteClean` for the test page.
- `src/popup.html` + `src/popup.js` — toolbar popup with two switches;
  changes are written to storage straight away (no Save button).
- `src/background.js` — service worker. Migrates old storage on
  install/update and renders the toolbar icon: full colour if at least one
  feature is on, greyed/faded if both are off. Badge `2` (green), `1` (amber)
  or `OFF` (grey); tooltip lists what is on. Re-renders on every storage change.
- `src/icons/` — WSU chevron mark at 48/96/128 px.
- `test/paste-test.html` — not packaged. Loads `../src/paste-clean.js`
  directly; editors to paste into and a "Run samples" table. `?auto` runs the
  samples on load (useful headless with `--dump-dom`).

## Storage
- `hideChat` and `cleanPaste` in `chrome.storage.local`, both default `true`.
- Up to 1.3 there was a single `enabled` key. `background.js` copies it to
  both new keys on install/update, then removes it. Content scripts and the
  popup fall back to `enabled` at start-up until that has happened.
- `content.js` listens only to `hideChat`; `paste-clean.js` only to
  `cleanPaste`.

## Cleaning rules (paste-clean.js)
- Removed with contents: comments (incl. Word conditional comments), `style`,
  `meta`, `head`, `script`, media (`svg`, `video`, `object`, …), form
  controls, Office namespaced tags (`o:`, `v:`, `w:`, `m:`). Other namespaced tags (`st1:` smart tags)
  are unwrapped so their text survives.
- Kept: `p br strong b em i u sub sup ul ol li a table thead tbody tfoot tr td th`.
  All attributes stripped except `href` on links (http/https/mailto/tel/ftp or
  relative; bookmark `#…` and other schemes unwrap the link) and
  `colspan`/`rowspan` > 1 on cells.
- `<img>` is kept only when `src` is `http:`/`https:`, with just `src` and
  `alt`. Images with `file:` (Word's local copies), `data:` or any other
  scheme are dropped. A paragraph holding only a kept image is not "empty".
- `h1`–`h6`, `div`, `blockquote` (and similar blocks) become `<p>`, or are
  unwrapped if they contain other blocks. Everything else is unwrapped.
- `&nbsp;` → space, whitespace collapsed, empty elements removed, runs of
  `<br>` collapsed, `<br>` at block edges removed, blocks trimmed.
- Leading list marker (`A.`, `a)`, `(a)`, `1.`, `i.`, `•`, …) is stripped only
  when the paste is a single paragraph with no `<br>`. Word list paragraphs
  otherwise stay as plain `<p>` with their literal numbering, because MCQ
  options often refer to it (i, ii, iii).
- A lone paragraph is inserted inline so it joins the paragraph being typed in.

## Conventions
- UK/South African English in all user-facing text and comments.
- Target the chat widget by its ID (`#wsu-chat-root`) only. Never use position
  or overlap heuristics: Moodle's own dialogs are fixed-position and
  full-screen and were being hidden by an earlier version.
- A feature that is off leaves no trace on the page (no style element, no
  listeners).
- Vanilla JS, zero dependencies.

## Dev workflow
- Code lives in WSL (`~/wsuMoodleAddon`); Chrome loads an unpacked copy from
  `C:\Users\drjua\wale-ext`.
- After editing: re-copy `src` to that folder, click ↻ on the extension card
  in `chrome://extensions`, then close and reopen the Moodle tab (old content
  scripts keep running in already-open tabs).
- Paste cleaner: open `test/paste-test.html` and click "Run samples"; all
  should pass. Headless from WSL:
  `chrome.exe --headless=new --dump-dom "file://wsl.localhost/<distro>/home/crash/wsuMoodleAddon/test/paste-test.html?auto"`
  and check the `summary` element.
- Bump `version` in the manifest for each release.
