# wsuMoodleAddon

A Chrome (Manifest V3) extension that hides the floating "Chat to Wale"
widget on WSU Moodle. The toolbar icon switches the add-on on and off and
shows its state.

## Layout
- `src/manifest.json` — manifest; `matches` scopes it to `*.wsu.ac.za`,
  content script runs at `document_start`.
- `src/content.js` — injects a single CSS rule hiding `#wsu-chat-root` while
  enabled and removes it when disabled. Listens to `chrome.storage.onChanged`
  so all open Moodle tabs update instantly. No DOM scanning or observers.
- `src/background.js` — service worker; toggles `enabled` in
  `chrome.storage.local` on icon click and renders the icon: full colour +
  green "ON" badge, or greyed/faded + grey "OFF" badge.
- `src/icons/` — WSU chevron mark at 48/96/128 px.

## Conventions
- UK/South African English in all user-facing text and comments.
- Target the widget by its ID (`#wsu-chat-root`) only. Never use position or
  overlap heuristics: Moodle's own dialogs are fixed-position and full-screen
  and were being hidden by an earlier version.
- When OFF, leave no trace on the page.
- Vanilla JS, zero dependencies.

## Dev workflow
- Code lives in WSL (`~/wsuMoodleAddon`); Chrome loads an unpacked copy from
  `C:\Users\drjua\wale-ext`.
- After editing: re-copy `src` to that folder, click ↻ on the extension card
  in `chrome://extensions`, then close and reopen the Moodle tab (old content
  scripts keep running in already-open tabs).
- Bump `version` in the manifest for each release.