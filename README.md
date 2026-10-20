# WiSeUp Toolkit

WiSeUp Toolkit is a small Chrome extension for iYunivesithi Walter Sisulu's
Moodle (version 2.1).
It does three things, and you can switch each one on or off separately:

1. **Hides the "Chat to Wale" widget.** The floating chat button can cover
   buttons on the page, such as those in the gradebook.
2. **Cleans text you paste from MS Word.** When you paste into a Moodle text
   editor on WiSeUp, Word's hidden formatting (fonts, colours, spacing, empty
   paragraphs) is removed. The text keeps its simple structure: paragraphs,
   bold, italics, lists, links and tables.
3. **Imports multiple-choice and matching questions from a Word document.** On the
   question bank's Import page, choose a .docx, check the preview, then
   click **Import N questions**. The questions go into the category
   "From MS Word" unless you untick that box, in which case they go into the
   category selected on the page. See "Importing questions from Word" below.

## Switching features on and off
Click the extension's icon in the Chrome toolbar. A small window opens with
three switches:
- **Hide 'Chat to Wale' widget**
- **Clean text pasted from Word**
- **Import questions from Word**

Changes take effect at once in every open Moodle tab and are remembered when
you restart Chrome. All switches are on by default.

The toolbar icon shows what is on:
- green **3** badge: all features on;
- amber **1** or **2** badge: some features on;
- greyed-out icon with a grey **OFF** badge: all features off.

Hover over the icon to see which features are on. A feature that is off
does not touch the page at all.

## What happens when you paste
The cleaner works only in Moodle's rich-text editors (question text, answer
options, feedback, page content and so on). Plain text boxes, such as a
question name, are left alone.

**Kept:** paragraphs, line breaks, **bold**, *italics*, underline,
subscript and superscript, bulleted and numbered lists, links to web pages,
email addresses and phone numbers, and tables (including merged cells).

**Converted:**
- Headings and other Word blocks become normal paragraphs.
- Non-breaking spaces become normal spaces, and runs of spaces become one.
- A single paragraph is pasted into the line you are typing in, rather than
  starting a new paragraph.
- Links to a place inside the Word document (bookmarks, cross-references)
  become plain text.

**Removed:** fonts, colours, sizes, styles, Word's hidden markup and
comments, empty paragraphs, extra blank lines, text boxes, shapes,
equations, embedded videos and form fields.

## Pictures
- **Screenshots**, and pictures you copy on their own, are pasted by
  Moodle's editor as normal.
- **Text and one picture from Word:** if what you copy from Word contains
  exactly one picture, the text is cleaned and the picture is embedded in it
  (stored inside the text, like Moodle's editor does).
- **Text and several pictures from Word:** Word does not give the browser
  the separate pictures, so the paste is left to Moodle's editor, untouched.
  To keep the pictures, paste them one at a time.
- **Text only:** when you copy plain text, Word may also put a picture of
  that text on the clipboard. The cleaner recognises this, ignores the
  picture and pastes the cleaned text.
- Pictures already on the web (addresses starting `http:` or `https:`, e.g.
  copied from another Moodle page) and embedded PNG, JPEG, GIF and WebP
  pictures are kept. All other pictures are removed: Word's local copies
  that cannot be embedded, SVG drawings, and pictures stored in any other
  way.

## Question numbers and option letters
Moodle numbers questions and letters answer options itself, so the numbers
Word adds would appear twice. The cleaner therefore removes:
- Word's **automatic numbering** when it is a number or letter: `3.`, `3)`,
  `(3)`, `A.`, `b)`, `(c)`.

It keeps:
- **roman numerals** `i` to `x` (e.g. `i.`, `ii)`, `(iv)`), so an option
  such as "i and iii only" still makes sense. In a lettered list, `I`, `V`
  and `X` are treated as roman numerals and kept too;
- **bullets**.

Numbers and letters you **typed** yourself (not Word's automatic
numbering):
- If you paste a **single paragraph**, any number, letter, roman numeral or
  bullet at its start is removed (`A.`, `a)`, `(a)`, `1.`, `3)`, `(3)`,
  `i.`, `•`).
- If you paste **more than one paragraph**, only the **first** paragraph
  loses a number or letter at its start (not a roman numeral). The other
  paragraphs are left as they are.

## Importing questions from Word
**Preparing the document**
- Number the questions with Word's numbering (`1.`, `2.`, …) and the
  options with lettered numbering (`A.`, `B.`, … or `a.`, `b.`, …). Typed
  `1.` and `A.` also work.
- Colour the right answer **red**. Each question needs exactly one red
  option.
- After the options, add a small table with `Marks:` and, if you want
  tags, `Topic:`, `Task:` and `Bloom:` (one `Label: value` per cell).
- **Matching questions:** write the question text, then a table with three
  columns: descriptions on the left, the answer letter in the middle and the
  terms on the right. A header row is optional. The terms may be lettered
  (Word's lettered numbering or typed `A.`, `B.`, …), but each letter points
  at a term by its position, so `C` is the third term. Extra terms that no letter
  points at become distractors. The answer letters need not be red. Put the
  `Marks:` table after the three-column table, as for multiple-choice.
- Only single-answer multiple-choice and matching questions are imported.
  Questions with pictures or equations are left out. Answers are never
  shuffled.

**Importing**
1. In your course, open **Question bank → Import**.
2. In the **Import Word document** box, choose the .docx.
3. Check the preview. Each question shows its stem, options, right answer,
   marks and tags (matching questions show the numbered descriptions beside
   their terms, then the distractors); questions that will be left out are
   greyed out with the reason.
4. Leave **Import questions into the category 'From MS Word'** ticked to
   put them in that category (Moodle creates it if needed), or untick it to
   use the category selected in Moodle's General section.
5. Click **Import N questions**. The extension attaches the file and
   clicks Moodle's Import button for you; Moodle then shows its usual
   import summary.

While the preview is shown, Moodle's own file box and Import button are
hidden. They come back if anything goes wrong, so you can always import an
XML file the normal way. The document never leaves your computer: it is
read and converted inside the browser.

## Installing and updating
The extension is not in the Chrome Web Store. It is loaded from a folder on
your computer.

**First install**
1. Download this repository and copy its `src` folder to a folder on
   Windows, e.g. `C:\Users\<you>\wale-ext`.
2. In Chrome, go to `chrome://extensions` and switch on **Developer mode**
   (top right).
3. Click **Load unpacked** and choose that folder.
4. Pin the extension (puzzle-piece icon → pin) so the switches are always
   to hand.

**Updating to a new version**
1. Copy the new `src` folder over the old one in the same Windows folder.
2. In `chrome://extensions`, click the reload button (↻) on the WiSeUp
   Toolkit card.
3. Close any Moodle tabs that are open and open them again. Tabs that were
   already open keep running the old version.

If you are upgrading from 1.3, your previous on/off choice is copied to
the chat and paste switches; the importer switch starts on.

Works in Chrome, Edge and Brave (version 121 or later), and in Firefox (see
below). The extension
collects no data and needs only permission to store its three settings.

## Installing in Firefox
Needs Firefox 128 or later.

**For a quick try (temporary):**
1. Download this repository.
2. In Firefox, go to `about:debugging`, then **This Firefox**.
3. Click **Load Temporary Add-on…** and choose `manifest.json` inside the
   `src` folder.

A temporary add-on is removed when Firefox restarts, so you have to load it
again each time.

**Permanent install:** Firefox only installs add-ons permanently if they are
signed by Mozilla. That needs a signed `.xpi` file from
addons.mozilla.org (AMO); there is none yet.

## For developers
**Question importer:** run `npm install` once, then `npm test` for the
offline tests of the .docx parser and Moodle XML generator
(`test/importer.test.js`). The rules are in `docs/importer-spec.md`.

**Paste cleaner:** open `test/paste-test.html` in Chrome; the extension does not need to be
installed. It has:
- two editors (TinyMCE-style iframe and Atto-style editable box): paste into
  either to see the raw and cleaned HTML;
- **Run samples**: runs the built-in samples (real and made-up Word pastes)
  and shows pass/fail for each. Add `?auto` to the address to run them on
  load, e.g. headless with `--dump-dom --virtual-time-budget=10000`, then
  check the `summary` element;
- **Copy raw clipboard**: copies everything your last paste contained (types,
  files, `text/html`, `text/plain`) as JSON, for reporting a paste that was
  not cleaned properly or turning it into a new sample.

## Developer
Dr Juan Carlos Garcia-Alonso, Department of Family Medicine and Rural Health,
iYunivesithi Walter Sisulu.

Issues and suggestions are welcome via
[GitHub Issues](https://github.com/drjuanc/wsuMoodleAddon/issues).
