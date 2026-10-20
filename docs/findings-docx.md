# Findings: structure of `test/mock-test.docx`

Reconnaissance for the planned Word → Moodle question bank feature. Examined
20 October 2026 by unzipping the file and reading `word/document.xml`,
`word/numbering.xml`, `word/styles.xml` and `word/theme/theme1.xml`.

The fixture may contain real exam items, so **all item text in the excerpts
below is dummy text**. The XML structure, attributes and colour values are
copied exactly; `w:rsid*` and `w14:paraId`/`w14:textId` attributes are left
out for brevity.

## Summary

| Question | Options | Option list (`numId`/`ilvl`) | Red options | Marks | Empty paras before table |
|---|---|---|---|---|---|
| 1 | 4 | 2 / 0, `A.` | 1 (A) | 1 | 2 |
| 2 | 4 | 3 / 0, `A.` | 1 (B) | 1 | 1 |
| 3 | 4 | 4 / 0, `A.` | 1 (B) | 1 | 1 |
| 4 | 4 | 5 / 0, `A.` | 1 (D) | **4** | 1 |
| 5 | 4 | 6 / 0, `A.` | 1 (B) | 1 | 1 |
| 6 | 4 | 7 / 0, `A.` | 1 (B) | 1 | **0** |
| 7 | 4 | **1 / 1, `A)`** | 1 (B) | 1 | 1 |
| 8 | 4 | 8 / 0, `A.` | 1 (A) | 1 | 1 |

- 8 questions, 4 options each, **all 8 have exactly one red option**.
- No images, equations, hyperlinks, fields, comments, tracked changes or
  content controls.
- The document opens with a 7-paragraph instructions block (plain paragraphs,
  no numbering) and a page break before question 1.

## 1. Numbering

Question numbers and option letters are all **real Word list numbering**
(`w:numPr`); none is typed text.

**Questions:** every question stem is `numId=1`, `ilvl=0`, style
`ListParagraph`. `numId 1` → `abstractNum 1`, level 0 = `decimal`, `%1.`.
This is consistent across all 8 questions, so the questions number 1–8
continuously.

**Options: not consistent, and not as assumed in CLAUDE.md.**

- **7 of 8 questions** put their options in a **separate list per question at
  `ilvl=0`**: `numId` 2, 3, 4, 5, 6, 7, 8 in order. Each maps to its own
  `abstractNum` whose level 0 is `upperLetter`, `%1.` (renders `A.`–`D.`).
  None of these `w:num` entries has a `w:lvlOverride`; each list restarts at
  A simply because it is a different list.
- **Question 7** puts its options at **`numId=1`, `ilvl=1`**, i.e. as a
  sub-level of the question list. `abstractNum 1` level 1 is `upperLetter`,
  `%2)` (renders `A)`–`D)`).

```xml
<!-- question stem (all questions) -->
<w:p><w:pPr><w:pStyle w:val="ListParagraph"/>
  <w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>
  <w:spacing w:after="0" w:line="276" w:lineRule="auto"/><w:ind w:left="426"/><w:jc w:val="both"/>
  <w:rPr><w:rFonts w:ascii="Tahoma" w:hAnsi="Tahoma" w:cs="Tahoma"/><w:bCs/></w:rPr></w:pPr>
  <w:r><w:rPr><w:rFonts w:ascii="Tahoma" w:hAnsi="Tahoma" w:cs="Tahoma"/><w:bCs/></w:rPr>
    <w:t>Dummy question stem</w:t></w:r></w:p>

<!-- option, questions 1–6 and 8: own list, level 0 -->
<w:numPr><w:ilvl w:val="0"/><w:numId w:val="2"/></w:numPr>

<!-- option, question 7: sub-level of the question list -->
<w:numPr><w:ilvl w:val="1"/><w:numId w:val="1"/></w:numPr>
```

```xml
<!-- numbering.xml (levels 3–8 omitted) -->
<w:abstractNum w:abstractNumId="1">
  <w:multiLevelType w:val="hybridMultilevel"/>
  <w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/>…</w:lvl>
  <w:lvl w:ilvl="1"><w:start w:val="1"/><w:numFmt w:val="upperLetter"/><w:lvlText w:val="%2)"/>…</w:lvl>
  <w:lvl w:ilvl="2"><w:start w:val="1"/><w:numFmt w:val="upperLetter"/><w:lvlText w:val="%3."/>…</w:lvl>
</w:abstractNum>
<w:num w:numId="1"><w:abstractNumId w:val="1"/></w:num>
<w:num w:numId="2"><w:abstractNumId w:val="6"/></w:num>   <!-- level 0 = upperLetter "%1." -->
```

**Implication for the parser:** `ilvl` alone cannot tell a question from an
option. Classify a numbered paragraph by the **resolved `numFmt`** of its
`numId`+`ilvl` (via `w:num` → `w:abstractNum` → `w:lvl`): `decimal` →
question; `upperLetter`/`lowerLetter` → option. (`numPr` can also be
inherited from a paragraph style; none is here, as `ListParagraph` carries no
`numPr`, but the resolver should still check.) The option letter should stay
positional, as planned.

## 2. Red answers

- Red is applied **only by direct run formatting**: `<w:color w:val="FF0000"/>`.
  It is the only colour value in `document.xml` (16 occurrences: 8 runs plus
  8 paragraph marks).
- **No `w:themeColor`, no `w:rStyle`, no coloured paragraph style** in the
  document body. `styles.xml` has theme colours only in styles the document
  does not use (headings, title, subtitle, quotes; `0F4761`, `595959`,
  `272727`). `theme1.xml` was checked for reference only: nothing in the body
  points to it. Note that its `accent2` is `E97132` (orange), which a "red
  range" must not catch if a future document uses theme colours.
- **The whole option is red** in every case: each correct option is a single
  run and that run is red.
- The **paragraph mark** (`w:pPr/w:rPr`) of each correct option is also red,
  so Word renders the list label (`A.`) in red too. This gives a second,
  independent signal.

```xml
<w:p><w:pPr><w:pStyle w:val="ListParagraph"/>
  <w:numPr><w:ilvl w:val="0"/><w:numId w:val="2"/></w:numPr>
  <w:spacing w:after="0" w:line="276" w:lineRule="auto"/><w:jc w:val="both"/>
  <w:rPr><w:rFonts w:ascii="Tahoma" w:hAnsi="Tahoma" w:cs="Tahoma"/><w:color w:val="FF0000"/></w:rPr></w:pPr>
  <w:r><w:rPr><w:rFonts w:ascii="Tahoma" w:hAnsi="Tahoma" w:cs="Tahoma"/><w:color w:val="FF0000"/></w:rPr>
    <w:t>Dummy correct option</w:t></w:r></w:p>
```

Some red runs also carry `<w:bCs/>` and some do not. `bCs` is bold for
complex scripts only and has no visible effect on Latin text, so ignore it.

## 3. Metadata table

- Every question has one table directly after it (after 0–2 empty
  paragraphs): **2 rows × 2 columns**, style `TableGrid`, `tblInd 720`.
- The cells are always in this order: `Marks:` | `Topic:` / `Task:` | `Bloom:`.
- Each cell holds **one paragraph with exactly two runs**: the label run
  (`Marks:`, colon included) and the value run, whose text starts with a
  space (`xml:space="preserve"`). **No label is split across runs** in this
  file, but the parser should still concatenate all runs of a cell before
  matching `Label: value`.
- The label is bold through **direct formatting** (`<w:b/>`), not a style.
  The value run has `<w:bCs/>` only, so it is not bold.
- Only `Bloom:` appears. There is **no `Bloom's:` variant and no typographic
  apostrophe** in this file.
- No unknown labels.

```xml
<w:tbl>
  <w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="0" w:type="auto"/><w:tblInd w:w="720" w:type="dxa"/>…</w:tblPr>
  <w:tblGrid><w:gridCol w:w="3811"/><w:gridCol w:w="3261"/></w:tblGrid>
  <w:tr>
    <w:tc><w:tcPr><w:tcW w:w="3811" w:type="dxa"/></w:tcPr>
      <w:p><w:pPr>…</w:pPr>
        <w:r><w:rPr><w:rFonts w:ascii="Tahoma" w:hAnsi="Tahoma" w:cs="Tahoma"/><w:b/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr>
          <w:t>Marks:</w:t></w:r>
        <w:r><w:rPr><w:rFonts w:ascii="Tahoma" w:hAnsi="Tahoma" w:cs="Tahoma"/><w:bCs/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr>
          <w:t xml:space="preserve"> 1</w:t></w:r></w:p></w:tc>
    <w:tc>… <w:t>Topic:</w:t> … <w:t xml:space="preserve"> Dummy topic</w:t> …</w:tc>
  </w:tr>
  <w:tr>
    <w:tc>… <w:t>Task:</w:t> … <w:t xml:space="preserve"> Dummy task</w:t> …</w:tc>
    <w:tc>… <w:t>Bloom:</w:t> … <w:t xml:space="preserve"> Understanding</w:t> …</w:tc>
  </w:tr>
</w:tbl>
```

Values seen: Marks `1` (7 questions) and `4` (question 4). Bloom is
`Understanding` in all 8. There are 2 distinct Topic values and 5 distinct
Task values (6 distinct values overall). The values
are short, have no commas and are under 50 characters, so no tag flags would
fire. In questions 3 and 4 the `Topic:` value is the same as the `Task:`
value of questions 1 and 2, so a term is used as a topic in one place and as a
task in another. This is content, not structure, but it shows tags may
overlap.

## 4. Irregularities

| What | Where | Note |
|---|---|---|
| Empty paragraphs between options and table | Q1: 2, Q2–5/7/8: 1, **Q6: 0** | Some are `Normal`, some `ListParagraph` with no `numPr`. Skip paragraphs with no text. |
| Empty paragraph between table and next question | all | Same. |
| Page break | instructions block | `<w:br w:type="page"/>` alone in a paragraph. **No manual line breaks** (`w:br` without a type) anywhere. |
| `<w:cr/>` | Q6, last option (D) | A carriage-return run after the option text. Trim it or treat it as whitespace, or the option text ends in a line break. |
| `<w:lastRenderedPageBreak/>` | Q5 stem, start of the run | A layout hint only; ignore it. |
| Stem split across runs | Q5 (`?` in its own run), Q6 (3 runs that differ only in `bCs`) | Always concatenate runs. |
| Missing question mark | Q1, Q2, Q3 | Content only; not a parser concern. |
| Subscript | Q6 stem and all 4 options | Written as the Unicode character `₂` (U+2082), **not** `w:vertAlign`. It is the only non-ASCII character in the file. |
| Option indentation | Q7 | `w:ind left=1134`; other options have no `w:ind`. Layout only. |
| Tabs, smart quotes, `<`, `>`, `&`, `w:vertAlign`, highlight/shading | none | None found. The future fixture set should include them on purpose. |
| Images, equations (`w:drawing`, `m:oMath`) | none | |
| Formatting consistency | all | Tahoma via direct `rFonts` on every run. Stems are not bold, and no bold appears outside table labels and the instructions block. |

## 5. Count

- **8 questions**, **4 options each** (32 options).
- **8 of 8** have exactly one red option; none has zero or more than one.
- 8 of 8 have a metadata table containing `Marks:`.
- Expected preview flags for this file: **none**.

## Effect on the decisions in CLAUDE.md

1. *"Options = list level 1"* holds for only 1 of 8 questions. Detect options
   by the letter format of the resolved numbering level, not by `ilvl`.
2. *"Question = list level 0"* also holds for options in 7 of 8 questions.
   Detect questions by `decimal` format (or by "numbered and not lettered").
3. Red is direct `FF0000` only here. The colour resolver for styles and theme
   is still needed for robustness, but this fixture does not exercise it.
4. The instructions block before question 1 must be ignored: it has text but
   no numbering.
5. Personal detail in the package: `docProps/core.xml` holds the author's
   full name in `dc:creator` and `cp:lastModifiedBy`. See `test/FIXTURES.md`.
