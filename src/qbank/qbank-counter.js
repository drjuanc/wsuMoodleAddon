// WiSeUp Toolkit — "97 questions listed · 5 selected" just above the question
// table in the quiz "Add from the question bank" modal, kept in view while the
// list scrolls. Part of the "Show all questions" switch (showAllQuestions).
// Only reads the DOM, so it runs in the isolated world.
(() => {
  const COUNTER_ID = "wiseup-qbank-counter";
  // Per-question boxes; the select-all box (#qbheadercheckbox) is data-toggle="master"
  const ROW_BOX = '#categoryquestions tbody input[type="checkbox"][data-togglegroup="qbank"][data-toggle="slave"]';
  // Inside div#question_table, which has no overflow of its own, so sticky works
  const TABLE = "#questionscontainer #categoryquestions";

  let enabled = false;
  let queued = false;

  function update() {
    queued = false;
    const existing = document.getElementById(COUNTER_ID);
    const table = enabled && document.querySelector(TABLE);
    if (!table) {
      existing?.remove();
      return;
    }
    const boxes = document.querySelectorAll(ROW_BOX);
    const listed = boxes.length;
    const selected = [...boxes].filter((b) => b.checked).length;
    const text = `${listed} question${listed === 1 ? "" : "s"} listed · ${selected} selected`;

    let counter = existing;
    if (!counter || counter.nextElementSibling !== table) {
      existing?.remove();
      counter = document.createElement("div");
      counter.id = COUNTER_ID;
      // Moodle's own Bootstrap classes: sticks to the top of the modal's scroll area
      counter.className = "sticky-top bg-white small text-muted py-1";
      counter.setAttribute("aria-live", "polite");
      table.before(counter);
    }
    // Only write when it changes, so our own edit does not wake the observer in a loop
    if (counter.textContent !== text) counter.textContent = text;
  }

  // Coalesce bursts (a whole list being re-rendered) into one update
  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  }

  // Opening the modal, Apply filters, sorting and category changes all replace the list
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });

  // Ticking a box. Moodle's select-all sets the other boxes' .checked without
  // firing events, so wait for its handler to finish before counting.
  for (const type of ["change", "click"]) {
    document.addEventListener(type, (e) => {
      if (e.target.closest?.("#questionscontainer")) setTimeout(schedule, 0);
    }, true);
  }

  function setEnabled(on) {
    enabled = on;
    schedule();
  }

  chrome.storage.local.get("showAllQuestions")
    .then(({ showAllQuestions }) => setEnabled(showAllQuestions ?? true));

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && "showAllQuestions" in changes) {
      setEnabled(changes.showAllQuestions.newValue !== false);
    }
  });
})();
