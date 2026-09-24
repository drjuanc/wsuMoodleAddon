# wsuMoodleAddon

A lightweight Chrome extension that hides the floating **"Chat to Wale"**
widget on Walter Sisulu University's Moodle, which can cover action buttons
such as those in the gradebook.

## Features
- Hides the chat widget, and nothing else. Moodle's own dialogs are untouched.
- One-click on/off from the toolbar icon:
  - **ON**: full-colour icon with a green `ON` badge; widget hidden.
  - **OFF**: greyed-out icon with a grey `OFF` badge; widget shown and the
    add-on leaves no trace on the page.
- Your choice is remembered across reloads and restarts, and applies to all
  open Moodle tabs instantly.
- No dependencies, no data collection, only the `storage` permission.

## Install (Chrome / Edge / Brave)
1. Download or clone this repository.
2. Open `chrome://extensions` and switch on **Developer mode**.
3. Click **Load unpacked** and select the `src` folder.
4. Pin the extension (puzzle-piece icon → pin) so the toggle is always visible.

## How it works
While enabled, the content script injects one CSS rule,
`#wsu-chat-root { display: none !important; }`, and removes it when disabled.

## Developer
Dr Juan Carlos Garcia-Alonso, Department of Family Medicine and Rural Health,
Walter Sisulu University.

Issues and suggestions are welcome via
[GitHub Issues](https://github.com/drjuanc/wsuMoodleAddon/issues).