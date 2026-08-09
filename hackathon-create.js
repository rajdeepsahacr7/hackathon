// Shared logic for the Create Hackathon wizard (hackathon-basics.html,
// hackathon-application.html and hackathon-prizes.html). Persists every
// field's value to localStorage under one combined object so moving
// between the pages never loses what was already entered.

const HC_STORAGE_KEY = "hackathonCreateData";

function hcGetStored() {
  try {
    const raw = localStorage.getItem(HC_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function hcFillFromStorage() {
  const data = hcGetStored();

  document.querySelectorAll(".hc-panel [name]").forEach((field) => {
    if (!(field.name in data)) return;

    if (field.type === "checkbox") {
      field.checked = !!data[field.name];
    } else {
      field.value = data[field.name];
    }
  });
}

function hcSaveCurrentPage() {
  const data = hcGetStored();

  document.querySelectorAll(".hc-panel [name]").forEach((field) => {
    if (field.type === "checkbox") {
      data[field.name] = field.checked;
    } else {
      data[field.name] = field.value;
    }
  });

  localStorage.setItem(HC_STORAGE_KEY, JSON.stringify(data));
}

function hcGoTo(url) {
  hcSaveCurrentPage();
  window.location.href = url;
}

function wireAdminLogout() {
  const link = document.getElementById("adminLogoutLink");
  if (!link) return;
  link.addEventListener("click", (e) => {
    e.preventDefault();
    fetch("api/admin_logout.php", { method: "POST" })
      .catch(() => {})
      .then(() => { window.location.href = "admin-login.html"; });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  // Only a logged-in admin/organiser can create hackathons.
  const navName = document.getElementById("saNavName");
  const navAvatar = document.getElementById("saNavAvatar");
  fetch("api/me.php")
    .then((res) => res.json())
    .then((data) => {
      if (!data.admin) {
        window.location.href = "admin-login.html";
        return;
      }
      if (navName) navName.textContent = (data.admin.displayName || data.admin.username).toUpperCase();
      if (navAvatar) {
        var src = (data.admin.displayName || data.admin.username || '').trim();
        var parts = src.split(/\s+/).filter(Boolean);
        navAvatar.textContent = (parts.length >= 2 ? (parts[0].charAt(0) + parts[1].charAt(0)) : src.slice(0, 2)).toUpperCase() || 'A';
      }
      wireAdminLogout();
    })
    .catch(() => {});

  hcFillFromStorage();

  document.querySelectorAll("[data-hc-nav]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      hcGoTo(el.getAttribute("data-hc-nav"));
    });
  });

  const finishBtn = document.getElementById("finishSetupBtn");
  if (finishBtn) {
    finishBtn.addEventListener("click", (e) => {
      e.preventDefault();
      hcSaveCurrentPage();

      const data = hcGetStored();

      // The prize tiers and judge rows are stored flat (prize1Amount,
      // judgeName1, …) so the same localStorage mechanism as every other
      // field covers them. The API wants them as arrays, so fold them into
      // the payload here and drop the flat keys.
      if (window.PrizesJudges) {
        const pj = window.PrizesJudges.collect();
        data.prizes = pj.prizes;
        data.judges = pj.judges;
      }
      Object.keys(data).forEach((k) => {
        if (/^prize\d+(Amount|Award|Icon|Perks)$/.test(k)) delete data[k];
        if (/^judge(Name|Title)\d+$/.test(k) || k === "judgeRows") delete data[k];
      });

      const originalLabel = finishBtn.textContent;
      finishBtn.disabled = true;
      finishBtn.textContent = "Saving\u2026";

      fetch("api/hackathons_create.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      })
        .then((res) => res.json().then((body) => ({ ok: res.ok, body })))
        .then(({ ok, body }) => {
          if (!ok || !body.success) {
            finishBtn.disabled = false;
            finishBtn.textContent = originalLabel;
            alert((body && body.error) || "Could not save the hackathon. Please try again.");
            return;
          }
          localStorage.removeItem(HC_STORAGE_KEY);
          window.location.href = "hackathons.html";
        })
        .catch(() => {
          finishBtn.disabled = false;
          finishBtn.textContent = originalLabel;
          alert("Could not reach the server. Is the PHP/MySQL backend running?");
        });
    });
  }
});
