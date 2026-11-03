<img src="src/icons/icon-128.png" alt="" width="64" align="right">

# WiSeUp Toolkit

WiSeUp Toolkit is a free browser extension for Chrome and Firefox that makes
everyday work on WiSeUp, the Moodle site of iYunivesithi Walter Sisulu (IWS),
easier. It hides the chat widget, cleans text you paste from Word, imports
questions from a Word document into the question bank, and shows all
questions at once when you add them to a quiz. Each feature has its own
on/off switch.

Current version: **2.4**.

## Features

### Hide the "Chat to Wale" widget
The floating "Chat to Wale" button can cover Moodle's own buttons, for
example in the gradebook. The extension hides it. Nothing else on the page
is hidden.

**Where:** every page on wsu.ac.za, including WiSeUp.

### Clean Word pastes into the editor
When you paste from Word into a Moodle text editor, Word's hidden
formatting comes along: fonts, colours, sizes, spacing and empty
paragraphs. The extension removes it and keeps the simple structure.

- **Kept:** paragraphs, line breaks, bold, italics, underline, subscript,
  superscript, bulleted and numbered lists, web and email links, and tables
  (including merged cells).
- **Changed:** headings become normal paragraphs. Runs of spaces become one
  space. A single paragraph joins the line you are typing in. Links to
  places inside the Word document become plain text.
- **Removed:** fonts, colours, styles, comments, empty paragraphs, extra
  blank lines, text boxes, shapes, equations, videos and form fields.
- **Question numbers and option letters:** Moodle numbers questions and
  letters options itself, so Word's automatic `1.`, `3)`, `A.`, `(b)` are
  removed. Roman numerals (`i.`, `ii)`, `(iv)`) and bullets are kept, so an
  option like "i and iii only" still makes sense. If you paste a single
  paragraph, a typed number, letter or bullet at its start is removed too.
  If you paste several paragraphs, only the first loses a typed number or
  letter.
- **Pictures:** screenshots and pictures copied on their own paste as
  normal. Word text with **one** picture is cleaned and the picture is kept.
  Word text with **several** pictures is left to Moodle untouched, because
  Word does not hand the separate pictures to the browser; paste them one at
  a time instead.

Plain text boxes, such as a question name, are left alone.

**Where:** rich-text editors on WiSeUp (question text, options, feedback,
page content and so on).

### Import questions from Word
On the question bank's **Import** page the extension adds an **Import Word
document** box. Choose a .docx, check the preview, and click **Import N
questions**. It imports three types: single-answer multiple choice (MCQ),
matching and essay.

**Everything happens in your browser.** The document is read and converted
on your computer. It is not uploaded to any third party, and no AI is used.
The only upload is the usual one: Moodle's own file picker sends the
finished question file to WiSeUp, exactly as if you had imported it by hand.

#### Formatting the Word document
**All question types**
- Number the questions with Word's numbered list (`1.`, `2.`, …). Typed
  `1.` or `1)` also works.
- After each question, add a small **metadata table** with one
  `Label: value` per cell. `Marks:` is required (`2` or `2 marks`).
  `Topic:`, `Task:`, `Bloom's:`, `SubT:` and `Module:` are optional and
  become tags. A value such as `-` is not turned into a tag. Labels are not
  case-sensitive and need not be bold.
- **Scenarios:** a paragraph directly above a question, with no empty line
  in between, is put in front of that question (for example
  "Scenario: A 45-year-old man…"). Above question 1, only a paragraph that
  starts with "Scenario" or "Case" counts. Other text above question 1
  (title, instructions) is ignored, and the preview says how many lines.
- "Red" means red or dark red font colour. At least half of the text must
  be red.

**Multiple choice (one correct answer)**
- Put the options in a lettered list (`A.`, `B.`, … or `a.`, `b.`, …).
  Typed `A.` to `H.` also works.
- Colour the correct option **red**. Exactly one option must be red.
- If your letters are lower case, Moodle shows them as a, b, c.

**Matching**
- Write the question text, then a table with **three columns**:
  description on the left, the answer letter in the middle, the term on the
  right. A header row is optional.
- Letters point at the terms by their position: `C` is the third term.
  Terms may be lettered (`A. Term`), but the position is what counts.
- Extra terms that no letter points at become distractors.
- The letters do not need to be red.
- Put the metadata table after the three-column table.

**Essay**
- A numbered question with no lettered options is an essay.
- Put the model answer (memo) in **red** after the question. It goes into
  Moodle's "Information for graders". Bullet lists stay bullet lists. A
  question with no memo is fine.
- **Response template:** if you put a table after the question, students
  get that table in their answer box, with the red answers blanked out. The
  full table, with the red answers, goes to the graders.
- You can keep "(3 marks)" in the question text; the marks still come from
  the metadata table.
- Students answer in Moodle's online text editor; file uploads are off.

#### The preview
After you choose the file, a table shows every question it found: number,
type, question text, options, correct answer, marks, tags and notes.
Matching questions list each description beside its term, then the
distractors. Essays show the memo and the response template.

Questions that cannot be imported are greyed out, with the reason (for
example "No option is marked in red"). Warnings, such as text that will be
left out, are shown in the Notes column but do not stop the import.

#### Importing
1. In your course, open **Question bank → Import**.
2. In the **Import Word document** box, choose your .docx.
3. Check the preview.
4. Choose the category. Leave **Import questions into the category 'From
   MS Word'** ticked to use that category (Moodle creates it if needed).
   Untick it to use the category selected in Moodle's General section; the
   box then shows "Questions will go to: …".
5. Click **Import N questions**. The extension attaches the file and clicks
   Moodle's Import button for you. Moodle then shows its usual summary.

While the preview is shown, Moodle's own file box and Import button are
hidden. They come back if anything goes wrong, so you can always import a
file the normal way.

**Where:** the question bank Import page on WiSeUp.

### Show all questions in "Add from the question bank"
On a quiz's **Questions** page, **Add → from question bank** opens a window
that shows 20 questions per page. With this feature on, the window lists up
to 1000 questions at once, so a whole category fits on one page and you can
select them all in one go. Moodle's page links disappear by themselves.
Filters, sorting and the category menu work as usual.

**Where:** the quiz Questions page on WiSeUp.

### Listed and selected counter
Just above the question list in the same window, a small line shows how
many questions are listed and how many you have ticked, for example
"97 questions listed · 5 selected". It stays in view while you scroll, and
updates when you tick boxes, use select-all, or change the filter, sorting
or category. It is part of the "Show all questions" switch.

## The popup switches
Click the extension's icon in the toolbar to open the switches. Changes
apply at once in every open WiSeUp tab and are remembered.

| Switch | What it controls | Default |
| --- | --- | --- |
| Hide 'Chat to Wale' widget | Hides the floating chat button | On |
| Clean text pasted from Word | Cleans Word pastes in Moodle editors | On |
| Import questions from Word | The "Import Word document" box on the Import page | On |
| Show all questions in the quiz question bank | Up to 1000 questions per page, plus the counter | On |

The "Show all questions" switch takes effect the next time the window loads
its list (open it again or click **Apply filters**).

The badge on the toolbar icon shows how many switches are on:
- green **4**: all features on;
- amber **1**, **2** or **3**: some features on;
- grey **OFF**, with a faded icon: all features off.

Hover over the icon to see which features are on. A feature that is off
does not touch the page.

## Installing
The extension is not in the Chrome Web Store or on Firefox Add-ons. You load
it from a folder on your computer.

### Chrome (version 121 or later)
1. Download this repository (green **Code** button → **Download ZIP**) and
   unzip it.
2. Go to `chrome://extensions` and switch on **Developer mode** (top right).
3. Click **Load unpacked** and choose the `src` folder.
4. Pin the extension (puzzle-piece icon → pin) so the switches are to hand.

Other Chromium browsers, such as Edge and Brave, may work but have not been
tested.

**To update:** replace the `src` folder with the new one, click ↻ on the
WiSeUp Toolkit card in `chrome://extensions`, then reload any open WiSeUp
tabs.

### Firefox (version 128 or later)
1. Download and unzip this repository.
2. Go to `about:debugging`, then **This Firefox**.
3. Click **Load Temporary Add-on…** and choose `manifest.json` inside the
   `src` folder.

A temporary add-on is **removed when Firefox restarts**, so you need to load
it again each time. A permanent install needs a version signed by Mozilla,
which does not exist yet.

## Privacy
- **What it stores:** only your four switch settings, in the browser's own
  extension storage on your computer.
- **Where it runs:** only on `wiseup.wsu.ac.za`, plus the chat-widget hider
  on other `wsu.ac.za` pages. It asks for no other permissions.
- **What it sends:** nothing. It has no server, no analytics and no AI. It
  loads no code from the internet. Your Word documents are read inside the
  browser. The only things that reach WiSeUp are what Moodle itself sends:
  the imported question file, and Moodle's own request for the question
  list, which the extension changes to ask for up to 1000 questions instead
  of 20.

## Known limitations
- **Question types:** only single-answer multiple choice, matching and
  essay. True/false, short answer, multiple-response (several correct
  answers), numerical and other types are not imported.
- **Pictures and equations:** questions that contain them are left out of
  the import.
- **File type:** .docx only. Not .doc or PDF.
- **No feedback:** feedback for options or questions is not imported; add it
  in Moodle afterwards.
- **No shuffling:** MCQ options and matching answers are imported in Word's
  order and not shuffled, because options often refer to each other ("Both
  A and B"). Turn shuffling on in Moodle if you want it.
- **Question names** are the first 80 or so characters of the question text,
  including any scenario in front of it, so several questions under one
  scenario can get similar names.
- **Options without letters:** if an MCQ's options are plain paragraphs,
  with no lettered list and no typed `A.`, the question is imported as an
  essay. Check the Type column in the preview.
- **Several pictures in one paste:** Word text with more than one picture is
  not cleaned (see above).
- **Show all questions:** a category with more than 1000 questions still
  gets page links.
- **Firefox:** temporary install only, for now.

## For developers
```
src/            the extension (load this folder)
  manifest.json, background.js (toolbar badge), popup.html/.js (switches)
  content.js    chat hider; passes the show-all switch to the page
  paste-clean.js  Word paste cleaner
  importer/     .docx parser, Moodle XML writer, preview, file attach
  qbank/        show-all request rewrite and the counter
  lib/          bundled JSZip
docs/           importer spec and .docx findings
test/           offline tests and test pages
```

- `npm install` once, then `npm test` for the importer tests.
- Open `test/paste-test.html` in Chrome to try the paste cleaner.
- After changes, copy `src` to the folder Chrome loads, then click ↻ on the
  extension's card:
  ```
  cp -r ~/wsuMoodleAddon/src/. "/mnt/c/Users/drjua/OneDrive - Walter Sisulu University/Dev/Extensions/WiSeUp Toolkit/"
  ```

See [CLAUDE.md](CLAUDE.md) for the project rules and technical details, and
[docs/importer-spec.md](docs/importer-spec.md) for the importer's rules.

## Author
Dr Juan Carlos Garcia-Alonso, Department of Family Medicine and Rural
Health, iYunivesithi Walter Sisulu.

Source code, issues and suggestions:
[github.com/drjuanc/wsuMoodleAddon](https://github.com/drjuanc/wsuMoodleAddon)

WiSeUp Toolkit is a personal project. It is not an official IWS product.
