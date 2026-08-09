/* ============================================================================
   Prizes (1st / 2nd / 3rd) + Judges — shared by the create wizard
   (hackathon-application.html) and the edit page (hackathon-edit.html).

   Markup contract: a container with id="pjPrizes" and one with id="pjJudges".
   Everything inside is generated here, so both pages stay in sync.

   Every generated input carries a `name`, which matters on the wizard: the
   existing hcSaveCurrentPage()/hcFillFromStorage() pair in hackathon-create.js
   walks `.hc-panel [name]`, so prize and judge values persist across the two
   wizard steps for free. Judge rows are dynamic, so the number of them is
   itself stored in a hidden `judgeRows` field — build() reads that back before
   hackathon-create.js fills the values in, which is why this file must be
   loaded BEFORE hackathon-create.js.

   window.PrizesJudges.collect() -> { prizes: [...], judges: [...] } shaped
   exactly as the API and hackathon-details.js expect.
   ========================================================================== */
(function () {
  "use strict";

  var TIERS = [
    { key: "prize1", place: "First Prize",  icon: "I" },
    { key: "prize2", place: "Second Prize", icon: "II" },
    { key: "prize3", place: "Third Prize",  icon: "III" }
  ];

  // Kept to a short list so the details page keeps a consistent look — an
  // organiser pasting an arbitrary emoji is fine too, but this is quicker.
  var ICONS = [
    { v: "I",   label: "First \u2014 I" },
    { v: "II",  label: "Second \u2014 II" },
    { v: "III", label: "Third \u2014 III" },
    { v: "IV",  label: "Fourth \u2014 IV" },
    { v: "V",   label: "Fifth \u2014 V" },
    { v: "\u2605", label: "Star" },
    { v: "\u2726", label: "Four-point star" },
    { v: "\u00A7", label: "Section mark" }
  ];

  /* Colour emoji fight the engraved palette, so the picker now offers Roman
     numerals. Rows saved before this change still hold emoji, so they are
     translated on the way in and on the way out. */
  var LEGACY_ICONS = {
    "\uD83C\uDFC6": "\u2605",
    "\uD83E\uDD47": "I",
    "\uD83E\uDD48": "II",
    "\uD83E\uDD49": "III",
    "\uD83D\uDD0E": "\u2726",
    "\uD83D\uDD0D": "\u2726",
    "\uD83D\uDD11": "\u00A7",
    "\uD83D\uDCDC": "\u00A7"
  };

  function normaliseIcon(v) {
    v = String(v == null ? "" : v).trim();
    return LEGACY_ICONS[v] || v;
  }

  var MAX_JUDGES = 12;
  var MAX_PERKS = 8;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function field(labelText, control, hintText) {
    var wrap = el("div", "pj-field");
    var lab = el("label", "pj-label", labelText);
    lab.setAttribute("for", control.id);
    wrap.appendChild(lab);
    if (hintText) wrap.appendChild(el("p", "pj-hint", hintText));
    wrap.appendChild(control);
    return wrap;
  }

  function input(id, name, placeholder, maxLength) {
    var i = document.createElement("input");
    i.type = "text";
    i.id = id;
    i.name = name;
    i.className = "pb-input pj-input";
    if (placeholder) i.placeholder = placeholder;
    if (maxLength) i.maxLength = maxLength;
    return i;
  }

  /* ------------------------------- prizes -------------------------------- */

  function buildPrizes(host) {
    host.appendChild(el("p", "pj-intro",
      "Fill in as many of the three as you are awarding. Leave a tier "
      + "completely blank and it simply won't appear on the hackathon's "
      + "details page \u2014 so a single-prize hackathon is fine."));

    TIERS.forEach(function (t, tierIndex) {
      // The three cards are identical, so the explanatory hints only go on the
      // first one rather than repeating three times down the page.
      var first = (tierIndex === 0);
      var card = el("div", "pj-card");
      card.setAttribute("data-tier", t.key);

      var head = el("div", "pj-card-head");
      head.appendChild(el("span", "pj-card-icon", normaliseIcon(t.icon)));
      head.appendChild(el("h3", "pj-card-title", t.place));
      card.appendChild(head);

      var amount = input(t.key + "Amount", t.key + "Amount", "$50,000", 60);
      card.appendChild(field("Prize amount", amount, first
        ? "Shown large on the card. Any currency \u2014 or wording like "
          + "\u201c\u20b91,00,000\u201d or \u201cFully funded trip\u201d."
        : null));

      var award = input(t.key + "Award", t.key + "Award", "The Holmes Award", 120);
      card.appendChild(field("Award name", award,
        first ? "Optional title for the prize, shown under the amount." : null));

      var sel = document.createElement("select");
      sel.id = t.key + "Icon";
      sel.name = t.key + "Icon";
      sel.className = "pb-input pj-input pj-icon-select";
      ICONS.forEach(function (o) {
        var opt = document.createElement("option");
        opt.value = o.v;
        opt.textContent = o.v + "   " + o.label;
        sel.appendChild(opt);
      });
      sel.value = normaliseIcon(t.icon);
      card.appendChild(field("Emblem", sel, null));

      var perks = document.createElement("textarea");
      perks.id = t.key + "Perks";
      perks.name = t.key + "Perks";
      perks.className = "pb-input pj-input pj-textarea";
      perks.rows = 5;
      perks.placeholder =
        "Cash Prize per Team\nGold Deerstalker Trophy\n1:1 Mentorship with Judges\nGuaranteed Internship Interview";
      card.appendChild(field("Prize details", perks, first
        ? "One per line \u2014 each becomes a bullet point on the card. Up to "
          + MAX_PERKS + "."
        : null));

      host.appendChild(card);
    });
  }

  function collectPrizes() {
    var out = [];
    TIERS.forEach(function (t) {
      var amount = (val(t.key + "Amount") || "").trim();
      var award = (val(t.key + "Award") || "").trim();
      var perksRaw = (val(t.key + "Perks") || "");
      var perks = perksRaw.split("\n")
        .map(function (s) { return s.replace(/^\s*[-*\u2022]\s*/, "").trim(); })
        .filter(Boolean)
        .slice(0, MAX_PERKS);

      // A tier the organiser never touched is left out entirely rather than
      // published as an empty card.
      if (!amount && !award && !perks.length) return;

      out.push({
        place: t.place,
        icon: (val(t.key + "Icon") || t.icon),
        amount: amount,
        award: award,
        perks: perks
      });
    });
    return out;
  }

  function fillPrizes(prizes) {
    if (!Array.isArray(prizes)) return;
    TIERS.forEach(function (t, i) {
      // Match on place name where possible so re-ordered data still lands in
      // the right tier; fall back to position.
      var p = prizes.filter(function (x) {
        return x && String(x.place || "").toLowerCase() === t.place.toLowerCase();
      })[0] || prizes[i];
      if (!p) return;
      set(t.key + "Amount", p.amount || "");
      set(t.key + "Award", p.award || "");
      if (p.icon) set(t.key + "Icon", normaliseIcon(p.icon));
      set(t.key + "Perks", (p.perks || []).join("\n"));
    });
  }

  /* ------------------------------- judges -------------------------------- */

  var judgeHost = null;
  var rowsField = null;
  // Only the create wizard keeps a draft in localStorage. The edit page loads
  // straight from the API, so it must not read or write that draft.
  var persistDraft = false;

  function judgeRowCount() {
    return judgeHost ? judgeHost.querySelectorAll(".pj-judge-row").length : 0;
  }

  function syncJudgeUI() {
    var n = judgeRowCount();
    if (rowsField) rowsField.value = String(n);
    judgeHost.querySelectorAll(".pj-judge-row").forEach(function (row, i) {
      var num = row.querySelector(".pj-judge-num");
      if (num) num.textContent = String(i + 1);
      var rm = row.querySelector(".pj-remove");
      // Never let them delete the last row — clearing it is the way to have
      // no judges, which keeps the section off the details page.
      if (rm) rm.hidden = (n <= 1);
    });
    var add = document.getElementById("pjAddJudge");
    if (add) add.hidden = (n >= MAX_JUDGES);
    var note = document.getElementById("pjJudgeNote");
    if (note) note.hidden = (n < MAX_JUDGES);
  }

  function addJudgeRow(index) {
    var i = (index != null) ? index : judgeRowCount() + 1;
    var row = el("div", "pj-judge-row");

    var head = el("div", "pj-judge-head");
    head.appendChild(el("span", "pj-judge-num", String(i)));
    var rm = el("button", "pj-remove", "Remove");
    rm.type = "button";
    rm.addEventListener("click", function () {
      row.remove();
      renumber();
    });
    head.appendChild(rm);
    row.appendChild(head);

    var name = input("judgeName" + i, "judgeName" + i, "Dr. Ada Hartley", 120);
    row.appendChild(field("Judge name", name, null));

    var title = input("judgeTitle" + i, "judgeTitle" + i, "Principal Engineer, Baker & Co.", 160);
    row.appendChild(field("Title or affiliation (optional)", title, null));

    judgeHost.appendChild(row);
    syncJudgeUI();
    return row;
  }

  // Names are positional (judgeName1, judgeName2, …), so after a removal the
  // remaining rows have to be renamed or the wizard's localStorage would
  // restore values into the wrong slots.
  function renumber() {
    var values = [];
    judgeHost.querySelectorAll(".pj-judge-row").forEach(function (row) {
      var ins = row.querySelectorAll("input");
      values.push({ name: ins[0] ? ins[0].value : "", title: ins[1] ? ins[1].value : "" });
    });
    judgeHost.querySelectorAll(".pj-judge-row").forEach(function (row, idx) {
      var i = idx + 1;
      var ins = row.querySelectorAll("input");
      if (ins[0]) { ins[0].id = ins[0].name = "judgeName" + i; ins[0].value = values[idx].name; }
      if (ins[1]) { ins[1].id = ins[1].name = "judgeTitle" + i; ins[1].value = values[idx].title; }
      var labs = row.querySelectorAll(".pj-label");
      if (labs[0]) labs[0].setAttribute("for", "judgeName" + i);
      if (labs[1]) labs[1].setAttribute("for", "judgeTitle" + i);
    });
    // Clear any now-orphaned trailing names out of the wizard's saved blob.
    for (var k = judgeRowCount() + 1; k <= MAX_JUDGES; k++) {
      dropStored("judgeName" + k);
      dropStored("judgeTitle" + k);
    }
    syncJudgeUI();
  }

  function dropStored(key) {
    if (!persistDraft) return;
    try {
      var raw = localStorage.getItem("hackathonCreateData");
      if (!raw) return;
      var d = JSON.parse(raw);
      if (key in d) { delete d[key]; localStorage.setItem("hackathonCreateData", JSON.stringify(d)); }
    } catch (e) { /* nothing worth doing */ }
  }

  function buildJudges(host) {
    judgeHost = el("div", "pj-judges-list");

    host.appendChild(el("p", "pj-intro",
      "These appear under \u201cThe Grand Inquisitors\u201d on the hackathon's "
      + "details page. Leave every row blank if judges aren't announced yet "
      + "\u2014 the section stays hidden until at least one is named."));
    host.appendChild(judgeHost);

    var add = el("button", "pj-add", "+  Add another judge");
    add.type = "button";
    add.id = "pjAddJudge";
    add.addEventListener("click", function () { addJudgeRow(); });
    host.appendChild(add);

    var note = el("p", "pj-hint", "That's the maximum of " + MAX_JUDGES + " judges.");
    note.id = "pjJudgeNote";
    note.hidden = true;
    host.appendChild(note);

    rowsField = document.createElement("input");
    rowsField.type = "hidden";
    rowsField.id = "judgeRows";
    rowsField.name = "judgeRows";
    host.appendChild(rowsField);

    // How many rows to lay out before hackathon-create.js fills values in.
    var want = 3;
    if (persistDraft) {
      try {
        var d = JSON.parse(localStorage.getItem("hackathonCreateData") || "{}");
        var stored = parseInt(d.judgeRows, 10);
        if (stored >= 1 && stored <= MAX_JUDGES) want = stored;
      } catch (e) { /* default of 3 */ }
    }

    for (var i = 0; i < want; i++) addJudgeRow();
  }

  function collectJudges() {
    var out = [];
    judgeHost.querySelectorAll(".pj-judge-row").forEach(function (row) {
      var ins = row.querySelectorAll("input");
      var name = ins[0] ? ins[0].value.trim() : "";
      if (!name) return;                       // unnamed rows are skipped
      out.push({
        name: name,
        title: ins[1] ? ins[1].value.trim() : "",
        photo: ""                              // no judge photo uploads yet
      });
    });
    return out;
  }

  function fillJudges(judges) {
    if (!Array.isArray(judges)) return;
    var want = Math.min(Math.max(judges.length, 1), MAX_JUDGES);
    while (judgeRowCount() > want) judgeHost.lastElementChild.remove();
    while (judgeRowCount() < want) addJudgeRow();
    syncJudgeUI();
    judgeHost.querySelectorAll(".pj-judge-row").forEach(function (row, i) {
      var j = judges[i] || {};
      var ins = row.querySelectorAll("input");
      if (ins[0]) ins[0].value = j.name || "";
      if (ins[1]) ins[1].value = j.title || "";
    });
  }

  /* ------------------------------- helpers ------------------------------- */

  function val(id) { var n = document.getElementById(id); return n ? n.value : ""; }
  function set(id, v) { var n = document.getElementById(id); if (n) n.value = v; }

  /* -------------------------------- mount ------------------------------- */

  function mount() {
    var p = document.getElementById("pjPrizes");
    var j = document.getElementById("pjJudges");
    if (!p && !j) return;
    persistDraft = !!document.getElementById("finishSetupBtn");
    if (p) buildPrizes(p);
    if (j) buildJudges(j);
  }

  window.PrizesJudges = {
    collect: function () {
      return {
        prizes: document.getElementById("pjPrizes") ? collectPrizes() : [],
        judges: judgeHost ? collectJudges() : []
      };
    },
    fill: function (prizes, judges) {
      if (document.getElementById("pjPrizes")) fillPrizes(prizes);
      if (judgeHost) fillJudges(judges);
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
