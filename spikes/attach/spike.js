// Throwaway spike: can a content script attach a file to Moodle's file picker
// on the question import page? Runs unchanged in the ISOLATED or MAIN world
// (switch "world" in manifest.json). Never submits the form.
(() => {
  "use strict";
  if (window.__wsuSpikeAttach) return;
  window.__wsuSpikeAttach = true;

  const log = (...args) => console.log("[spike]", ...args);
  const warn = (...args) => console.warn("[spike]", ...args);

  const FILE_NAME = "spike-test.xml";
  const XML = `<?xml version="1.0" encoding="UTF-8"?>
<quiz>
  <question type="multichoice">
    <name><text>SPIKE 1 primary colour</text></name>
    <questiontext format="html"><text><![CDATA[<p>Spike test 1: which of these is a primary colour of light?</p>]]></text></questiontext>
    <generalfeedback format="html"><text></text></generalfeedback>
    <defaultgrade>2</defaultgrade>
    <penalty>0.3333333</penalty>
    <hidden>0</hidden>
    <idnumber></idnumber>
    <single>true</single>
    <shuffleanswers>false</shuffleanswers>
    <answernumbering>ABCD</answernumbering>
    <showstandardinstruction>0</showstandardinstruction>
    <correctfeedback format="html"><text></text></correctfeedback>
    <partiallycorrectfeedback format="html"><text></text></partiallycorrectfeedback>
    <incorrectfeedback format="html"><text></text></incorrectfeedback>
    <answer fraction="100" format="html"><text>Green</text><feedback format="html"><text></text></feedback></answer>
    <answer fraction="0" format="html"><text>Yellow</text><feedback format="html"><text></text></feedback></answer>
    <answer fraction="0" format="html"><text>Black &amp; white</text><feedback format="html"><text></text></feedback></answer>
    <tags>
      <tag><text>spike-test</text></tag>
      <tag><text>Dummy topic A</text></tag>
      <tag><text>Understanding</text></tag>
    </tags>
  </question>
  <question type="multichoice">
    <name><text>SPIKE 2 days in a week</text></name>
    <questiontext format="html"><text><![CDATA[<p>Spike test 2: how many days are there in a week?</p>]]></text></questiontext>
    <generalfeedback format="html"><text></text></generalfeedback>
    <defaultgrade>1</defaultgrade>
    <penalty>0.3333333</penalty>
    <hidden>0</hidden>
    <idnumber></idnumber>
    <single>true</single>
    <shuffleanswers>false</shuffleanswers>
    <answernumbering>ABCD</answernumbering>
    <showstandardinstruction>0</showstandardinstruction>
    <correctfeedback format="html"><text></text></correctfeedback>
    <partiallycorrectfeedback format="html"><text></text></partiallycorrectfeedback>
    <incorrectfeedback format="html"><text></text></incorrectfeedback>
    <answer fraction="0" format="html"><text>5</text><feedback format="html"><text></text></feedback></answer>
    <answer fraction="100" format="html"><text>7</text><feedback format="html"><text></text></feedback></answer>
    <answer fraction="0" format="html"><text>10</text><feedback format="html"><text></text></feedback></answer>
    <tags>
      <tag><text>spike-test</text></tag>
      <tag><text>Dummy task B</text></tag>
      <tag><text>Remembering</text></tag>
    </tags>
  </question>
</quiz>
`;

  // Which world are we in? Page globals such as M are only visible in MAIN.
  const ext = (typeof browser !== "undefined" && browser.runtime && browser.runtime.id) ||
    (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.id);
  const pageM = typeof window.M !== "undefined" ? window.M : null;
  const world = ext ? "ISOLATED" : "MAIN";
  log(`loaded; world=${world}; page M visible=${!!pageM}; UA=${navigator.userAgent}`);

  // Resource timing works in both worlds and shows that a request happened,
  // even when its response is out of reach.
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        if (e.name.includes("repository_ajax.php")) {
          log("network (resource timing):", e.name, `status=${e.responseStatus ?? "n/a"}`,
            `duration=${Math.round(e.duration)}ms`, `transferSize=${e.transferSize}`);
        }
      }
    }).observe({ type: "resource", buffered: false });
  } catch (err) {
    warn("PerformanceObserver unavailable:", err);
  }

  // In MAIN only: wrap XHR so Moodle's own upload response can be logged.
  function hookXhr() {
    if (world !== "MAIN" || XMLHttpRequest.prototype.__spikeHooked) return;
    XMLHttpRequest.prototype.__spikeHooked = true;
    const open = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url, ...rest) {
      if (String(url).includes("repository_ajax.php")) {
        this.addEventListener("loadend", () => {
          log(`Moodle XHR ${method} ${url} -> HTTP ${this.status}:`, this.responseText);
        });
      }
      return open.call(this, method, url, ...rest);
    };
    log("XHR hook installed (MAIN world)");
  }

  // Pull the options object out of the inline M.form_filepicker.init(Y, {...}) call.
  function filepickerOptions() {
    const marker = "M.form_filepicker.init(Y, ";
    for (const s of document.scripts) {
      const text = s.textContent;
      const at = text.indexOf(marker);
      if (at < 0) continue;
      const start = at + marker.length;
      let depth = 0, inStr = false, esc = false;
      for (let i = start; i < text.length; i++) {
        const c = text[i];
        if (inStr) {
          if (esc) esc = false;
          else if (c === "\\") esc = true;
          else if (c === '"') inStr = false;
        } else if (c === '"') inStr = true;
        else if (c === "{") depth++;
        else if (c === "}" && --depth === 0) return JSON.parse(text.slice(start, i + 1));
      }
    }
    return null;
  }

  function cfgSesskey() {
    for (const s of document.scripts) {
      const m = /M\.cfg = \{[^;]*?"sesskey":"([^"]+)"/.exec(s.textContent);
      if (m) return m[1];
    }
    return null;
  }

  const mask = (v) => (v ? `${String(v).slice(0, 2)}… (${String(v).length} chars)` : String(v));

  function makeFile() {
    const file = new File([XML], FILE_NAME, { type: "text/xml" });
    log(`built File name=${file.name} type=${file.type} size=${file.size}`);
    return file;
  }

  function waitFor(test, what, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
      const t0 = performance.now();
      const tick = () => {
        const v = test();
        if (v) return resolve(v);
        if (performance.now() - t0 > timeoutMs) return reject(new Error(`timed out waiting for ${what}`));
        setTimeout(tick, 200);
      };
      tick();
    });
  }

  function selectXmlFormat() {
    const radio = document.querySelector("input#id_format_xml");
    if (!radio) throw new Error("#id_format_xml not found");
    radio.checked = true;
    radio.dispatchEvent(new Event("change", { bubbles: true }));
    log("step 1: ticked #id_format_xml and dispatched change; checked =", radio.checked);
  }

  async function findPicker() {
    const opts = filepickerOptions();
    if (!opts) throw new Error("M.form_filepicker.init(...) options not found");
    const clientId = opts.client_id;
    log(`filepicker options: client_id=${clientId} itemid=${opts.itemid} maxfiles=${opts.maxfiles} ` +
      `maxbytes=${opts.maxbytes} accepted_types=${JSON.stringify(opts.accepted_types)} ctx=${opts.context && opts.context.id}`);
    const wrapper = await waitFor(() => {
      const w = document.getElementById(`filepicker-wrapper-${clientId}`);
      return w && w.style.display !== "none" && w.offsetParent !== null ? w : null;
    }, "visible filepicker wrapper");
    log(`step 2: #${wrapper.id} is visible; body classes dndsupported=${document.body.classList.contains("dndsupported")} ` +
      `dndnotsupported=${document.body.classList.contains("dndnotsupported")}`);
    const container = document.getElementById(`file_info_${clientId}`);
    if (!container) throw new Error(`#file_info_${clientId} not found`);
    return { opts, clientId, container };
  }

  function watchPicker(clientId) {
    const nameEl = document.querySelector(`#file_info_${clientId} .filepicker-filename`);
    const newfile = document.getElementById("id_newfile");
    if (newfile) newfile.addEventListener("change", () => log("#id_newfile change event (Moodle's filepicker callback ran)"), { once: true });
    if (nameEl) {
      new MutationObserver(() => log("picker filename now:", JSON.stringify(nameEl.textContent.trim())))
        .observe(nameEl, { childList: true, subtree: true, characterData: true });
    }
    // Moodle reports upload errors in a YUI dialogue.
    const errObs = new MutationObserver(() => {
      const msg = document.querySelector(".fp-msg-error .fp-msg-text");
      if (msg && msg.textContent.trim()) {
        warn("Moodle error dialogue:", msg.textContent.trim());
        errObs.disconnect();
      }
    });
    errObs.observe(document.body, { childList: true, subtree: true, characterData: true });
    setTimeout(() => errObs.disconnect(), 30000);
  }

  async function runA() {
    log(`--- method A (${world}) ---`);
    hookXhr();
    selectXmlFormat();
    const { clientId, container } = await findPicker();
    watchPicker(clientId);
    const file = makeFile();

    let dt;
    try {
      dt = new DataTransfer();
      dt.items.add(file);
    } catch (err) {
      warn("could not build DataTransfer:", err);
      return;
    }
    log(`DataTransfer: types=${JSON.stringify(Array.from(dt.types))} files=${dt.files.length}`);

    for (const type of ["dragenter", "dragover", "drop"]) {
      let ev;
      try {
        ev = new DragEvent(type, { bubbles: true, cancelable: true, composed: true, dataTransfer: dt });
      } catch (err) {
        warn(`could not construct DragEvent(${type}):`, err);
        return;
      }
      const seen = ev.dataTransfer;
      log(`${type}: event.dataTransfer ${seen ? `types=${JSON.stringify(Array.from(seen.types))} files=${seen.files.length}` : "is null"}`);
      container.dispatchEvent(ev);
      // Moodle's check_drag() calls preventDefault() only when it accepts the drag.
      log(`${type}: dispatched on #${container.id}; defaultPrevented=${ev.defaultPrevented} ` +
        `(true = Moodle accepted it); container classes="${container.className}"`);
    }
    log("method A: events sent; watch for the filename / network lines above and below");
  }

  async function runB() {
    log(`--- method B (${world}) ---`);
    selectXmlFormat();
    const { opts, clientId } = await findPicker();

    const repo = Object.values(opts.repositories || {}).find((r) => r.type === "upload");
    const newfile = document.getElementById("id_newfile");
    const form = newfile && newfile.closest("form");
    const formSesskey = form && form.querySelector('input[name="sesskey"]') && form.querySelector('input[name="sesskey"]').value;
    const sesskey = formSesskey || cfgSesskey();
    const itemid = newfile ? newfile.value : String(opts.itemid);
    const ctxId = opts.context && opts.context.id;

    log(`parsed: repo_id=${repo && repo.id} itemid=${itemid} (init says ${opts.itemid}) ctx_id=${ctxId} ` +
      `sesskey=${mask(sesskey)} (form and M.cfg agree: ${formSesskey === cfgSesskey()}) author=${opts.author ? "present" : "absent"}`);
    if (!repo || !itemid || !sesskey || !ctxId) {
      warn("missing a required value; not sending");
      return;
    }

    const fd = new FormData();
    fd.append("repo_upload_file", makeFile());
    fd.append("sesskey", sesskey);
    fd.append("repo_id", repo.id);
    fd.append("itemid", itemid);
    if (opts.author) fd.append("author", opts.author);
    fd.append("savepath", "/");
    fd.append("title", FILE_NAME);
    fd.append("ctx_id", ctxId);
    for (const t of [].concat(opts.accepted_types || [])) fd.append("accepted_types[]", t);

    const url = new URL("/repository/repository_ajax.php?action=upload", location.origin).href;
    let res, text;
    try {
      res = await fetch(url, { method: "POST", body: fd, credentials: "same-origin" });
      text = await res.text();
    } catch (err) {
      warn("fetch failed:", err);
      return;
    }
    log(`method B: HTTP ${res.status}; response:`, text);
    let json = null;
    try { json = JSON.parse(text); } catch { warn("response is not JSON"); }
    if (!json) return;
    if (json.error) { warn("Moodle returned an error:", json.error); return; }
    log(`method B: stored as "${json.file}" in draft item ${json.id}; the picker UI is NOT refreshed by B`);

    // MAIN only: ask Moodle's own callback to show the file, to see whether B can stand alone.
    if (world === "MAIN" && pageM && pageM.form_filepicker && pageM.form_filepicker.callback) {
      try {
        pageM.form_filepicker.callback({ url: json.url, file: json.file, client_id: clientId });
        log("method B (MAIN): called M.form_filepicker.callback to refresh the picker");
      } catch (err) {
        warn("M.form_filepicker.callback failed:", err);
      }
    }
  }

  function addButtons() {
    const box = document.createElement("div");
    box.style.cssText = "position:fixed;left:12px;bottom:12px;z-index:2147483647;display:flex;gap:8px;" +
      "font:13px/1.2 system-ui,sans-serif";
    const make = (label, fn) => {
      const b = document.createElement("button");
      b.type = "button"; // never submits the import form
      b.textContent = `${label} (${world})`;
      b.style.cssText = "padding:6px 10px;border:2px solid #b00;background:#fff3f3;color:#600;border-radius:4px;cursor:pointer";
      b.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        fn().catch((err) => warn("failed:", err));
      });
      return b;
    };
    box.append(make("Spike: attach", runA), make("Spike: upload B", runB));
    document.body.appendChild(box);
    log("buttons added");
  }

  addButtons();
})();
