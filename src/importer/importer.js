// Question bank import page: adds an "Import Word document" box above the
// file picker. The lecturer chooses a .docx, checks the preview and the
// category, then clicks "Import N questions": Moodle XML is ticked, the
// generated file is handed to dropper.js (main world), which drops it onto the
// picker, and once it is attached Moodle's Import button is clicked.
// By default the XML starts with the category "From MS Word" and Moodle's
// "Get category/context from file" are ticked; untick our checkbox to use the
// category selected on the page instead.
// Rules: docs/importer-spec.md.
(() => {
  if (document.body.id !== "page-question-bank-importquestions-import") return;

  const BOX_ID = "wsu-importer";
  const CATEGORY_NAME = "From MS Word";
  // dropper.js allows 15 s for the picker plus 30 s for the upload
  const ATTACH_TIMEOUT_MS = 50000;
  const { docx, moodleXml, preview: { previewModel } } = globalThis.wsuImporter;

  // Moodle's own file row and Import button: hidden while our preview is
  // shown, never removed, as dropper.js drops onto the picker inside the
  // first and the submit clicks #id_submitbutton in the second
  const MOODLE_ROWS = ["fitem_id_newfile", "fitem_id_submitbutton"];
  function showMoodleRows(on) {
    for (const id of MOODLE_ROWS) {
      const row = document.getElementById(id);
      if (row) row.style.display = on ? "" : "none";
    }
  }

  function el(tag, props = {}, ...kids) {
    const node = Object.assign(document.createElement(tag), props);
    node.append(...kids.filter((k) => k != null));
    return node;
  }

  // Firefox: binary data read here belongs to the page's compartment and
  // fails JSZip's instanceof checks, so hand JSZip a base64 string instead
  function readBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).slice(String(reader.result).indexOf(",") + 1));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  // The parser's HTML (escaped text in p, strong, br, sub, sup, lists and
  // tables) is copied element by element from an inert parse, without
  // attributes, so nothing else can reach the page
  const SAFE_TAGS = new Set(["P", "STRONG", "B", "EM", "I", "BR", "SUB", "SUP",
    "UL", "OL", "LI", "TABLE", "TBODY", "TR", "TD"]);
  function safeHtml(html) {
    const frag = document.createDocumentFragment();
    const copy = (from, to) => {
      for (const n of from.childNodes) {
        if (n.nodeType === Node.TEXT_NODE) to.append(n.data);
        else if (n.nodeType !== Node.ELEMENT_NODE) continue;
        else if (!SAFE_TAGS.has(n.tagName)) copy(n, to);
        else {
          const e = document.createElement(n.tagName);
          if (n.tagName === "P") e.style.margin = "0";
          if (n.tagName === "UL" || n.tagName === "OL") e.style.cssText = "margin: 0; padding-left: 1.2em";
          if (n.tagName === "TABLE") e.style.cssText = "width: 100%; border-collapse: collapse";
          if (n.tagName === "TD") e.style.cssText = "border: 1px solid #ccc; padding: 0 0.25em; min-width: 1.5em";
          to.append(e);
          copy(n, e);
        }
      }
    };
    copy(new DOMParser().parseFromString(html, "text/html").body, frag);
    return frag;
  }

  // Answer tables: whole words (the preview table breaks anywhere), and a
  // sideways scroll if they do not fit the column
  function tableHtml(html) {
    return el("div", { style: "overflow-x: auto; overflow-wrap: normal; word-break: normal" }, safeHtml(html));
  }

  const COLUMNS = [
    ["#", "3.5rem"], ["Type", "5.5rem"], ["Question", ""], ["Options", "20%"],
    ["Answer", "14%"], ["Marks", "4rem"], ["Tags", "11%"], ["Notes", "12%"]
  ];

  function previewTable(questions) {
    return el("table", { className: "table table-sm table-bordered mb-0", style: "table-layout: fixed; min-width: 56rem; overflow-wrap: anywhere" },
      el("colgroup", {}, ...COLUMNS.map(([, width]) => el("col", { style: width ? `width: ${width}` : "" }))),
      el("thead", {}, el("tr", {}, ...COLUMNS.map(([name]) => el("th", { scope: "col", textContent: name })))),
      el("tbody", {}, ...questions.flatMap(previewRows)));
  }

  // One row per question (an essay shows its memo under Answer), except that
  // a matching question gets one row per pair (plus one for the distractors)
  // so each description sits beside its term; the other cells span those rows
  function previewRows(q) {
    const m = previewModel(q);
    const notes = el("td");
    if (m.excluded) notes.append(el("div", { className: "font-weight-bold", textContent: `Excluded: ${m.reasons.join("; ")}` }));
    for (const w of m.warnings) notes.append(el("div", { className: "text-warning", textContent: `⚠ ${w}` }));

    let lines;
    if (m.pairs) {
      lines = m.pairs.map((p) => [
        // The table's overflow-wrap would otherwise split "1." when the
        // description wraps; 2em fits "10." so the descriptions line up
        el("td", {}, el("div", { className: "d-flex" },
          el("span", { className: "mr-1", style: "flex: 0 0 auto; min-width: 2em; white-space: nowrap", textContent: p.label }),
          el("div", { style: "flex: 1 1 auto; min-width: 0" }, safeHtml(p.html)))),
        el("td", { textContent: p.answer })
      ]);
      if (m.extras.length) {
        lines.push([el("td"), el("td", {},
          el("div", { className: "small text-muted", textContent: "Extra:" }),
          ...m.extras.map((t) => el("div", { textContent: t })))]);
      }
      if (!lines.length) lines.push([el("td"), el("td")]);
    } else if (m.memoHtml != null) {
      lines = [[
        el("td"),
        el("td", {}, m.memoHtml ? tableHtml(m.memoHtml) : el("span", { className: "small text-muted", textContent: "No memo" }))
      ]];
    } else {
      lines = [[
        el("td", {}, ...m.options.map((t) => el("div", { textContent: t }))),
        el("td", { textContent: m.answer })
      ]];
    }

    const span = (cell) => Object.assign(cell, { rowSpan: lines.length });
    const rows = lines.map((cells, i) => {
      if (i) cells.forEach((c) => (c.style.borderTopStyle = "dotted"));
      return el("tr", {}, ...cells);
    });
    rows[0].prepend(...[
      el("td", { textContent: m.number }),
      el("td", { textContent: m.type }),
      el("td", {}, safeHtml(m.stemHtml), m.templateHtml ? el("div", { className: "mt-1" },
        el("div", { className: "small text-muted", textContent: "Response template:" }),
        tableHtml(m.templateHtml)) : null)
    ].map(span));
    rows[0].append(...[
      el("td", { textContent: m.marks }),
      el("td", { textContent: m.tags }),
      notes
    ].map(span));
    if (m.excluded) {
      for (const row of rows) {
        row.classList.add("text-muted");
        row.style.opacity = "0.6";
      }
    }
    return rows;
  }

  // Clicks Import and calls onBlocked if Moodle's form validation (or the
  // browser's) stops the submission, so the lecturer is not left stuck
  function submitForm(submit, onBlocked) {
    let sent = false;
    const onSubmit = (ev) => setTimeout(() => (sent = !ev.defaultPrevented), 0);
    submit.form.addEventListener("submit", onSubmit, { once: true });
    submit.click();
    // Queued after onSubmit's check, as click() dispatches submit synchronously
    setTimeout(() => {
      submit.form.removeEventListener("submit", onSubmit);
      if (!sent) onBlocked();
    }, 0);
  }

  function buildBox() {
    const fileInput = el("input", { type: "file", accept: ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
    const status = el("div", { className: "mt-2" });
    const preview = el("div", { className: "mt-2" });
    const importBtn = el("button", { type: "button", className: "btn btn-primary mr-3" });
    const ownCategory = el("input", { type: "checkbox", className: "form-check-input", id: `${BOX_ID}-category`, checked: true });
    const categoryNote = el("span", { className: "ml-3 text-muted" });
    // Bootstrap's d-flex is !important and beats [hidden], so hide a wrapper
    const controls = el("div", { hidden: true },
      el("div", { className: "mt-2 d-flex flex-wrap align-items-center" },
        importBtn,
        el("div", { className: "form-check" },
          ownCategory,
          el("label", { className: "form-check-label", htmlFor: ownCategory.id, textContent: `Import questions into the category '${CATEGORY_NAME}'` })
        ),
        categoryNote
      )
    );
    let pending = null; // { base, questions, count }
    let busy = false;

    const categorySelect = document.getElementById("id_category");
    const showCategory = () => {
      if (ownCategory.checked) return (categoryNote.textContent = "");
      const opt = categorySelect && categorySelect.selectedOptions[0];
      const name = opt ? opt.textContent.replace(/\s+/g, " ").trim() : "(not found)";
      categoryNote.textContent = `Questions will go to: ${name}`;
    };
    if (categorySelect) categorySelect.addEventListener("change", showCategory);
    ownCategory.addEventListener("change", showCategory);

    const say = (text, kind = "") => {
      status.className = `mt-2 ${kind}`;
      status.textContent = text;
    };

    const setBusy = (on) => {
      busy = on;
      importBtn.disabled = on || !pending || pending.count === 0;
      fileInput.disabled = ownCategory.disabled = on;
    };

    fileInput.addEventListener("change", async () => {
      pending = null;
      controls.hidden = true;
      showMoodleRows(true);
      preview.replaceChildren();
      const file = fileInput.files[0];
      if (!file) return say("");
      say("Reading the document…");
      try {
        const { questions, notes } = await docx.parseDocx(await readBase64(file));
        const { included } = moodleXml.buildMoodleXml(questions);
        if (questions.length) {
          preview.append(el("div", { className: "table-responsive" }, previewTable(questions)));
        }
        const summary = [
          `${included.length} of ${questions.length} questions will be imported.`,
          ...notes.map((n) => n.message)
        ].join(" ");
        say(summary, included.length ? "" : "text-danger");
        pending = { base: file.name.replace(/\.docx$/i, "") || "questions", questions, count: included.length };
        importBtn.textContent = `Import ${pending.count} question${pending.count === 1 ? "" : "s"}`;
        showCategory();
        setBusy(false);
        controls.hidden = false;
        showMoodleRows(false);
      } catch (err) {
        say(`Could not read the document: ${err.message}`, "text-danger");
      }
    });

    importBtn.addEventListener("click", (e) => {
      e.preventDefault();
      if (busy || !pending || !pending.count) return;
      const radio = document.getElementById("id_format_xml");
      const submit = document.getElementById("id_submitbutton");
      const fromFile = ["id_catfromfile", "id_contextfromfile"].map((id) => document.getElementById(id));
      const fail = (text) => {
        say(text, "text-danger");
        showMoodleRows(true);
        setBusy(false);
      };
      if (!radio) return fail("Could not find the Moodle XML format option.");
      if (!submit) return fail("Could not find Moodle's Import button.");
      if (ownCategory.checked && fromFile.some((box) => !box)) {
        return fail("Could not find Moodle's \"Get category from file\" options.");
      }
      setBusy(true);

      const tick = (input) => {
        input.checked = true;
        input.dispatchEvent(new Event("change", { bubbles: true }));
      };
      tick(radio);
      if (ownCategory.checked) fromFile.forEach(tick);

      const { xml } = moodleXml.buildMoodleXml(pending.questions,
        ownCategory.checked ? { category: `$course$/top/${CATEGORY_NAME}` } : {});
      const name = `${pending.base}.xml`;

      say("Attaching the file…");
      let done = false;
      const finish = (ok, message) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        document.removeEventListener("wsu-importer:result", onResult);
        if (ok) {
          say(`Attached ${name}. Importing…`, "text-success");
          submitForm(submit, () => fail("Moodle did not accept the form. Check its messages below and import from there."));
        } else {
          fail(`Could not attach the file: ${message}`);
        }
      };
      const onResult = (ev) => {
        const { ok, message } = JSON.parse(ev.detail);
        finish(ok, message);
      };
      // Backstop in case dropper.js never answers; it times out on its own first
      const timer = setTimeout(() => finish(false, "Timed out waiting for Moodle's file picker"), ATTACH_TIMEOUT_MS);
      document.addEventListener("wsu-importer:result", onResult);
      document.dispatchEvent(new CustomEvent("wsu-importer:attach", { detail: JSON.stringify({ name, xml }) }));
    });

    return el("div", { id: BOX_ID, className: "border rounded p-3 mb-3" },
      el("h5", { textContent: "Import Word document" }),
      fileInput,
      status,
      preview,
      controls
    );
  }

  function apply(enabled) {
    const existing = document.getElementById(BOX_ID);
    if (!enabled) {
      showMoodleRows(true);
      return existing && existing.remove();
    }
    if (existing) return;
    const picker = document.getElementById("fitem_id_newfile");
    if (picker) picker.before(buildBox());
  }

  // Defaults to ON, like the other features
  chrome.storage.local.get("importDocx").then(({ importDocx }) => apply(importDocx ?? true));

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && "importDocx" in changes) apply(changes.importDocx.newValue !== false);
  });
})();
