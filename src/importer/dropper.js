// Main-world helper for importer.js: drops the generated Moodle XML onto the
// import page's file picker, as a user dragging the file there would. It must
// run in the page's world, because Firefox ignores drops dispatched from an
// isolated content script (see docs/spike-attach.md). It never submits the
// form; importer.js clicks Import once the file is attached.
// Messages are JSON strings so they cross between worlds in both browsers:
//   in:  "wsu-importer:attach" { name, xml }
//   out: "wsu-importer:result" { ok, message }
(() => {
  if (window.__wsuImporterDropper) return;
  window.__wsuImporterDropper = true;

  const UPLOAD_TIMEOUT_MS = 30000;

  // client_id from the inline M.form_filepicker.init(Y, {...}) call
  function pickerClientId() {
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
        else if (c === "}" && --depth === 0) return JSON.parse(text.slice(start, i + 1)).client_id;
      }
    }
    return null;
  }

  function waitFor(test, what, timeoutMs) {
    return new Promise((resolve, reject) => {
      const t0 = performance.now();
      const tick = () => {
        let v;
        try {
          v = test();
        } catch (err) {
          return reject(err);
        }
        if (v) return resolve(v);
        if (performance.now() - t0 > timeoutMs) return reject(new Error(`Timed out waiting for ${what}`));
        setTimeout(tick, 200);
      };
      tick();
    });
  }

  async function attach(name, xml) {
    const clientId = pickerClientId();
    if (!clientId) throw new Error("Could not find Moodle's file picker on this page");
    await waitFor(() => {
      const w = document.getElementById(`filepicker-wrapper-${clientId}`);
      // Not offsetParent: importer.js may hide the picker's row with display:none
      return w && w.style.display !== "none";
    }, "the file picker", 15000);
    if (!document.body.classList.contains("dndsupported")) {
      throw new Error("Moodle's drag-and-drop upload is not available on this page");
    }
    const container = document.getElementById(`file_info_${clientId}`);
    if (!container) throw new Error("Could not find Moodle's file picker on this page");

    const dt = new DataTransfer();
    dt.items.add(new File([xml], name, { type: "text/xml" }));
    let accepted = true;
    for (const type of ["dragenter", "dragover", "drop"]) {
      const ev = new DragEvent(type, { bubbles: true, cancelable: true, composed: true, dataTransfer: dt });
      container.dispatchEvent(ev);
      // Moodle calls preventDefault() only when it accepts the drag
      accepted = accepted && ev.defaultPrevented;
    }
    if (!accepted) throw new Error("Moodle's file picker did not accept the file");

    // Moodle shows the file name in the picker once the upload has worked
    const nameEl = container.querySelector(".filepicker-filename");
    await waitFor(() => {
      const err = document.querySelector(".fp-msg-error .fp-msg-text");
      if (err && err.textContent.trim()) throw new Error(`Moodle: ${err.textContent.trim()}`);
      return nameEl && nameEl.textContent.includes(name.replace(/\.xml$/i, ""));
    }, "the upload", UPLOAD_TIMEOUT_MS);
  }

  function reply(ok, message) {
    document.dispatchEvent(new CustomEvent("wsu-importer:result", { detail: JSON.stringify({ ok, message }) }));
  }

  document.addEventListener("wsu-importer:attach", (e) => {
    let req;
    try {
      req = JSON.parse(e.detail);
    } catch {
      return;
    }
    attach(req.name, req.xml).then(
      () => reply(true, ""),
      (err) => reply(false, err.message)
    );
  });
})();
