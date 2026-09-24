# WSU Moodle Helper

A lightweight Chrome extension for Walter Sisulu University's Moodle with two
features, each of which can be switched on or off separately:

1. **Hide the "Chat to Wale" widget.** The floating chat button can cover
   action buttons, such as those in the gradebook.
2. **Clean text pasted from MS Word.** Text pasted into Moodle's editors
   loses Word's hidden formatting (fonts, colours, spacing, empty
   paragraphs), and keeps only simple structure: paragraphs, bold, italics,
   underline, sub/superscript, lists, links and tables.

## Using it
Click the toolbar icon to open a small popup with two switches:
- **Hide 'Chat to Wale' widget**
- **Clean text pasted from Word**

Changes apply straight away to every open Moodle tab and are remembered across
restarts. Both are on by default.

The toolbar icon shows the current state:
- green **2** badge: both features on;
- amber **1** badge: one feature on;
- greyed-out icon with a grey **OFF** badge: both off.

Hover over the icon to see which features are on. A feature that is off leaves
no trace on the page.

## What the paste cleaner does
- Removes Word's styles, classes, fonts, comments and hidden markup.
- Turns headings into normal paragraphs, removes empty paragraphs and extra
  line breaks, and changes non-breaking spaces into normal spaces.
- Keeps table structure, including merged cells.
- Keeps numbering such as "i.", "ii.", "iii." that Word has turned into text,
  so MCQ options that refer to it still make sense. The one exception: if you
  paste a **single** paragraph, a leading "A.", "a)", "(a)", "1.", "i." or "•"
  is removed.
- **Image pastes go to Moodle as normal.** A screenshot, or a selection
  from Word that includes a picture, is passed to Moodle's editor untouched.
  (When you copy plain text, Word may also add a picture of that text to the
  clipboard. The cleaner recognises this, ignores the picture and cleans the
  text.)
- Inside pasted text, images that are already on the web (`http`/`https`
  addresses, e.g. copied from another Moodle page) are kept. Images that only
  exist on your computer or are embedded in the paste are removed.
- Only Moodle's rich-text editors are affected. Plain text boxes are left
  alone.

## Install (Chrome / Edge / Brave)
1. Download or clone this repository.
2. Open `chrome://extensions` and switch on **Developer mode**.
3. Click **Load unpacked** and select the `src` folder.
4. Pin the extension (puzzle-piece icon → pin) so the popup is always to hand.

Upgrading from 1.3: your previous on/off choice is carried over to both
features.

## How it works
- **Chat widget:** while on, a content script injects one CSS rule,
  `#wsu-chat-root { display: none !important; }`, and removes it when off.
- **Paste cleaner:** a content script runs in every frame on
  `wiseup.wsu.ac.za` (Moodle's TinyMCE editor lives inside an iframe). It
  intercepts pastes into rich-text editors, cleans the HTML and inserts the
  result, so the editor records the change as usual.
- No dependencies, no data collection, only the `storage` permission.

## Testing the paste cleaner
Open `test/paste-test.html` in Chrome (no need to install the extension).
Paste from Word into either editor to see the raw and cleaned HTML, or click
**Run samples** to run the built-in checks.

## Developer
Dr Juan Carlos Garcia-Alonso, Department of Family Medicine and Rural Health,
Walter Sisulu University.

Issues and suggestions are welcome via
[GitHub Issues](https://github.com/drjuanc/wsuMoodleAddon/issues).
