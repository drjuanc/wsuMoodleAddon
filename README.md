# WSU Moodle Helper

A small Chrome extension for Walter Sisulu University's Moodle (version 1.4).
It does two things, and you can switch each one on or off separately:

1. **Hides the "Chat to Wale" widget.** The floating chat button can cover
   buttons on the page, such as those in the gradebook.
2. **Cleans text you paste from MS Word.** When you paste into a Moodle text
   editor on WiSeUp, Word's hidden formatting (fonts, colours, spacing, empty
   paragraphs) is removed. The text keeps its simple structure: paragraphs,
   bold, italics, lists, links and tables.

## Switching features on and off
Click the extension's icon in the Chrome toolbar. A small window opens with
two switches:
- **Hide 'Chat to Wale' widget**
- **Clean text pasted from Word**

Changes take effect at once in every open Moodle tab and are remembered when
you restart Chrome. Both switches are on by default.

The toolbar icon shows what is on:
- green **2** badge: both features on;
- amber **1** badge: one feature on;
- greyed-out icon with a grey **OFF** badge: both features off.

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
2. In `chrome://extensions`, click the reload button (↻) on the WSU Moodle
   Helper card.
3. Close any Moodle tabs that are open and open them again. Tabs that were
   already open keep running the old version.

If you are upgrading from 1.3, your previous on/off choice is copied to
both switches.

Works in Chrome, Edge and Brave. The extension collects no data and needs
only permission to store its two settings.

## For developers
Open `test/paste-test.html` in Chrome; the extension does not need to be
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
Walter Sisulu University.

Issues and suggestions are welcome via
[GitHub Issues](https://github.com/drjuanc/wsuMoodleAddon/issues).
