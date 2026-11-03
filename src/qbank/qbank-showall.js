// WiSeUp Toolkit — show all questions in the quiz "Add from the question bank" modal.
// Runs in the page (MAIN world) so it can wrap Moodle's own XHR/fetch calls.
// Moodle 4.3 honours qperpage in both fragments (mod_quiz quiz_question_bank and
// question_data), and its pager hides itself once everything fits on one page.
// content.js sets <html data-wiseup-showall="on|off"> from the popup switch.
(() => {
  const PER_PAGE = 1000;

  // Set to true to trace requests in the console. Never log a full service.php
  // URL: it carries the sesskey.
  const DEBUG = false;
  const log = (...a) => DEBUG && console.debug("[WiSeUp showall]", ...a);

  const isFragmentUrl = (url) =>
    typeof url === "string" &&
    url.includes("/lib/ajax/service.php") &&
    url.includes("core_get_fragment");

  function setArg(list, name, value) {
    const arg = list.find((p) => p.name === name);
    if (arg) arg.value = value;
    else list.push({ name, value });
  }

  function rewrite(body) {
    // Read at request time, so the popup switch applies without a reload
    if (document.documentElement.dataset.wiseupShowall === "off") return body;
    let calls;
    try { calls = JSON.parse(body); } catch { return body; }
    if (!Array.isArray(calls)) return body;

    let changed = false;
    for (const call of calls) {
      const a = call && call.args;
      if (call.methodname !== "core_get_fragment" || !a || a.component !== "mod_quiz" || !Array.isArray(a.args)) continue;

      if (a.callback === "question_data") {
        // Page clicks / Apply filters
        setArg(a.args, "qperpage", PER_PAGE);
        setArg(a.args, "qpage", "0");
        changed = true;
      } else if (a.callback === "quiz_question_bank") {
        // First load of the modal
        const qsArg = a.args.find((p) => p.name === "querystring");
        if (qsArg && typeof qsArg.value === "string") {
          const qs = new URLSearchParams(qsArg.value.replace(/^\?/, ""));
          qs.set("qperpage", String(PER_PAGE));
          qs.delete("qpage");
          qsArg.value = "?" + qs.toString();
          changed = true;
        }
      }
    }
    if (changed) log("body before", body, "after", JSON.stringify(calls));
    return changed ? JSON.stringify(calls) : body;
  }

  // XHR (Moodle's core/ajax uses jQuery → XHR)
  const origOpen = XMLHttpRequest.prototype.open;
  const origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this._wiseupUrl = String(url);
    return origOpen.call(this, method, url, ...rest);
  };
  XMLHttpRequest.prototype.send = function (body) {
    if (isFragmentUrl(this._wiseupUrl) && typeof body === "string") body = rewrite(body);
    return origSend.call(this, body);
  };

  // fetch (insurance for future Moodle versions)
  const origFetch = window.fetch;
  window.fetch = function (input, init) {
    const url = typeof input === "string" ? input : input && input.url;
    if (isFragmentUrl(url) && init && typeof init.body === "string") {
      init = { ...init, body: rewrite(init.body) };
    }
    return origFetch.call(this, input, init);
  };

  log("loaded");
})();
