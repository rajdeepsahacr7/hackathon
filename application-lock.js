// Shared logic for the four locked application pages
// (application-about.html, application-skills.html,
// application-links.html, application-contact.html).
//
// Each page has its own riddle (data-answer on #riddleForm).
// Solving it unlocks that page's fields and persists the
// unlocked state, so returning to an already-solved section
// doesn't re-lock it. Field values are saved to localStorage
// under one combined object shared across all four pages.

const AF_STORAGE_KEY = "applicationFormData";

function afGetStored() {
  try {
    const raw = localStorage.getItem(AF_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function afSaveFields(container) {
  const data = afGetStored();
  container.querySelectorAll("[name]").forEach((field) => {
    if (field.type === "checkbox") {
      data[field.name] = field.checked;
    } else {
      data[field.name] = field.value;
    }
  });
  localStorage.setItem(AF_STORAGE_KEY, JSON.stringify(data));
}

function afFillFields(container) {
  const data = afGetStored();
  container.querySelectorAll("[name]").forEach((field) => {
    if (!(field.name in data)) return;
    if (field.type === "checkbox") {
      field.checked = !!data[field.name];
    } else {
      field.value = data[field.name];
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  // This is a participant-only flow — bounce anyone not logged in.
  fetch("api/me.php")
    .then((res) => res.json())
    .then((data) => {
      if (!data.participant) {
        window.location.href = "login.html";
      }
    })
    .catch(() => {});

  // Capture ?hackathon=<id> from the URL (set when the user clicked
  // "Apply Now" on a hackathon) and remember it across all four steps.
  const params = new URLSearchParams(window.location.search);
  const hackathonIdFromUrl = params.get("hackathon");
  if (hackathonIdFromUrl) {
    const stored = afGetStored();
    stored.hackathonId = hackathonIdFromUrl;
    localStorage.setItem(AF_STORAGE_KEY, JSON.stringify(stored));
  }

  // Hide any fields this hackathon's organiser turned off in the
  // creation wizard (e.g. they didn't ask for a LinkedIn link).
  const currentHackathonId = afGetStored().hackathonId;
  if (currentHackathonId) {
    fetch(`api/hackathons_get.php?id=${encodeURIComponent(currentHackathonId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.success) return;
        const fields = data.hackathon.fields;
        Object.keys(fields).forEach((key) => {
          if (!fields[key]) {
            document.querySelectorAll(`[data-toggle-field="${key}"]`).forEach((el) => {
              el.style.display = "none";
            });
          }
        });
      })
      .catch(() => {});
  }

  const riddleForm = document.getElementById("riddleForm");
  const answerInput = document.getElementById("riddleAnswer");
  const feedback = document.getElementById("riddleFeedback");
  const attemptsEl = document.getElementById("riddleAttempts");
  const hintBox = document.getElementById("riddleHint");
  const hintText = document.getElementById("riddleHintText");
  const titleEl = document.getElementById("riddleTitle");
  const textEl = document.getElementById("riddleText");
  const tilesEl = document.getElementById("cipherTiles");
  const wrap = document.getElementById("afFormWrap");
  const lockOverlay = document.getElementById("afLockOverlay");
  const saveBtn = document.getElementById("afSaveBtn");
  const saveFeedback = document.getElementById("afSaveFeedback");

  const sectionKey = riddleForm.dataset.section || "section";

  // The answer is not in this file, not in the markup, and not in storage.
  // Only the server knows it, and only the server decides who is let in —
  // api/applications_submit.php refuses any application whose four riddles
  // are not recorded as solved, so editing the DOM here gains nothing.

  function setFeedback(message, kind) {
    feedback.textContent = message || "";
    feedback.className = "puzzle-feedback" + (kind ? " " + kind : "");
  }

  function showHint(text) {
    if (!text || !hintBox) return;
    hintText.textContent = text;
    hintBox.hidden = false;
  }

  function showAttempts(n) {
    if (!attemptsEl) return;
    if (!n) { attemptsEl.hidden = true; return; }
    attemptsEl.textContent =
      n === 1 ? "1 false deduction on record."
              : n + " false deductions on record.";
    attemptsEl.hidden = false;
  }

  function renderRiddle(data) {
    if (titleEl && data.title) titleEl.textContent = data.title;
    if (textEl && data.text) textEl.textContent = data.text;

    // Caesar-cipher sections show their ciphertext as tiles.
    if (tilesEl) {
      if (data.cipher) {
        tilesEl.innerHTML = "";
        data.cipher.split("").forEach((ch) => {
          const span = document.createElement("span");
          span.className = "cipher-letter";
          span.textContent = ch;
          tilesEl.appendChild(span);
        });
        tilesEl.hidden = false;
      } else {
        tilesEl.hidden = true;
      }
    }
  }

  function lockDown() {
    wrap.classList.add("locked");
    if (lockOverlay) lockOverlay.classList.remove("hidden");
    wrap.querySelectorAll("input, textarea, select").forEach((f) => {
      f.disabled = true;
    });
    saveBtn.disabled = true;
  }

  function unlock(silent) {
    wrap.classList.remove("locked");
    if (lockOverlay) lockOverlay.classList.add("hidden");
    wrap.querySelectorAll("input, textarea, select").forEach((f) => {
      f.disabled = false;
    });
    saveBtn.disabled = false;
    riddleForm.classList.add("solved");
    answerInput.disabled = true;
    const btn = riddleForm.querySelector(".answer-btn");
    if (btn) btn.disabled = true;

    if (!silent) setFeedback("Correct. The section is unlocked.", "correct");
    else setFeedback("Solved. This section is already open to you.", "correct");
  }

  // Start sealed no matter what the markup says, then ask the server
  // whether this participant has in fact earned their way in.
  lockDown();

  fetch("api/riddles_get.php?section=" + encodeURIComponent(sectionKey))
    .then((res) => res.json())
    .then((data) => {
      if (!data.success) return;
      renderRiddle(data);
      showAttempts(data.solved ? 0 : data.attempts);
      if (data.hint && !data.solved) showHint(data.hint);
      if (data.solved) unlock(true);
    })
    .catch(() => {
      setFeedback("Could not reach the case files. Check your connection.", "incorrect");
    });

  // Mark the step strip so the participant can see at a glance which
  // seals are still unbroken. Each tab gets a small padlock or a tick;
  // the tally comes from the server, not from this page's state.
  const AF_TAB_PAGES = {
    about:   "application-about.html",
    skills:  "application-skills.html",
    links:   "application-links.html",
    contact: "application-contact.html"
  };

  function markTabs() {
    fetch("api/riddles_get.php")
      .then((res) => res.json())
      .then((data) => {
        if (!data.success || !data.sections) return;
        data.sections.forEach((s) => {
          const page = AF_TAB_PAGES[s.section];
          if (!page) return;

          // The current step is a <span>, the others are links.
          let tab = document.querySelector('.hc-tabs a[href="' + page + '"]');
          if (!tab && s.section === sectionKey) {
            tab = document.querySelector(".hc-tabs .hc-tab.active");
          }
          if (!tab) return;

          tab.querySelectorAll(".af-tab-lock").forEach((n) => n.remove());
          const badge = document.createElement("span");
          badge.className = "af-tab-lock" + (s.solved ? " solved" : "");
          badge.textContent = s.solved ? "\u2713" : "\u25CF";
          badge.title = s.solved ? "Solved" : "Still sealed";
          badge.setAttribute("aria-label", s.solved ? "solved" : "still sealed");
          tab.appendChild(badge);
        });
      })
      .catch(() => {});
  }

  markTabs();

  riddleForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const value = answerInput.value.trim();
    if (!value) {
      setFeedback("Write something before you deduce.", "incorrect");
      return;
    }

    setFeedback("Considering\u2026", "");
    fetch("api/riddles_answer.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section: sectionKey, answer: value })
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.cooldown) {
          setFeedback(data.error, "incorrect");
          return;
        }
        if (!data.success) {
          setFeedback(data.error || "Something went wrong. Try again.", "incorrect");
          return;
        }
        if (data.correct) {
          unlock(false);
          showAttempts(0);
          markTabs();
          return;
        }
        setFeedback(data.message, "incorrect");
        showAttempts(data.attempts);
        if (data.hint) showHint(data.hint);
        answerInput.select();
      })
      .catch(() => {
        setFeedback("Could not reach the case files. Check your connection.", "incorrect");
      });
  });

  afFillFields(wrap);

  saveBtn.addEventListener("click", () => {
    afSaveFields(wrap);
    const allData = afGetStored();

    if (!allData.hackathonId) {
      saveFeedback.textContent = "Saved locally. Start from a hackathon's \u201cApply Now\u201d button to submit to an event.";
      setTimeout(() => { saveFeedback.textContent = ""; }, 4000);
      return;
    }

    saveFeedback.textContent = "Saving\u2026";
    fetch("api/applications_submit.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(allData)
    })
      .then((res) => res.json().then((body) => ({ ok: res.ok, body })))
      .then(({ ok, body }) => {
        saveFeedback.textContent = ok && body.success
          ? "Saved."
          : (body && body.error) || "Could not save. Please try again.";
        setTimeout(() => { saveFeedback.textContent = ""; }, 3000);
      })
      .catch(() => {
        saveFeedback.textContent = "Saved locally, but could not reach the server.";
        setTimeout(() => { saveFeedback.textContent = ""; }, 3000);
      });
  });
});
