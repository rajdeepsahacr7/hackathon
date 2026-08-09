// Edit Hackathon page (hackathon-edit.html). Loads the hackathon named in
// ?id= via api/hackathons_get.php, prefills the form, and saves changes
// through api/hackathons_update.php — the endpoint already existed but had
// no UI wired to it yet.

function heWireAdminLogout() {
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
  const id = new URLSearchParams(window.location.search).get("id");

  const navName = document.getElementById("saNavName");
  const navAvatar = document.getElementById("saNavAvatar");
  const panel = document.getElementById("editPanel");
  const errorEl = document.getElementById("editError");
  const titleEl = document.getElementById("editTitle");
  const saveBtn = document.getElementById("saveChangesBtn");

  function showError(msg) {
    if (!errorEl) return;
    errorEl.textContent = msg;
    errorEl.style.display = "block";
  }

  if (!id) {
    showError("No hackathon was specified. Go back to My Cases and pick one to edit.");
    if (panel) {
      Array.from(panel.children).forEach((el) => {
        if (el !== errorEl) el.style.display = "none";
      });
    }
    return;
  }

  function fillForm(h) {
    if (titleEl) titleEl.textContent = "Editing Case: " + h.name;

    // Hand the banner picker the id, so choosing an image uploads and attaches
    // it to this hackathon straight away, and show whatever it already has.
    if (window.BannerUpload) {
      window.BannerUpload.attachTo(h.id);
      window.BannerUpload.setBanner(h.bannerUrl || "");
    }

    document.getElementById("hackathonName").value = h.name || "";
    document.getElementById("hackathonAbout").value = h.about || "";
    document.getElementById("status").value = h.status || "published";
    document.getElementById("mode").value = h.mode || "online";
    document.getElementById("venue").value = h.venue || "";
    document.getElementById("teamMin").value = h.teamMin || 2;
    document.getElementById("teamMax").value = h.teamMax || 5;
    document.getElementById("durationHours").value = h.durationHours || 48;
    document.getElementById("seats").value = h.seats || 200;
    document.getElementById("applicationStart").value = h.applicationStart || "";
    document.getElementById("applicationEnd").value = h.applicationEnd || "";
    document.getElementById("hackathonStart").value = h.hackathonStart || "";
    document.getElementById("hackathonEnd").value = h.hackathonEnd || "";

    const f = h.fields || {};
    document.getElementById("fieldFullName").checked = !!f.fullName;
    document.getElementById("fieldBio").checked = !!f.bio;
    document.getElementById("fieldGender").checked = !!f.gender;
    document.getElementById("fieldDomainExpertise").checked = !!f.domainExpertise;
    document.getElementById("fieldSkills").checked = !!f.skills;
    document.getElementById("fieldGithub").checked = !!f.github;
    document.getElementById("fieldLinkedin").checked = !!f.linkedin;
    document.getElementById("fieldPhone").checked = !!f.phone;
    document.getElementById("fieldEmail").checked = !!f.email;

    if (window.PrizesJudges) {
      window.PrizesJudges.fill(h.prizes || [], h.judges || []);
    }
  }

  function wireSave() {
    if (!saveBtn) return;
    saveBtn.addEventListener("click", (e) => {
      e.preventDefault();
      if (errorEl) errorEl.style.display = "none";

      const name = document.getElementById("hackathonName").value.trim();
      if (!name) { showError("Please give the hackathon a name."); return; }

      const appStart = document.getElementById("applicationStart").value;
      const appEnd = document.getElementById("applicationEnd").value;
      const hkStart = document.getElementById("hackathonStart").value;
      const hkEnd = document.getElementById("hackathonEnd").value;
      if (appStart && appEnd && appStart > appEnd) { showError("Applications cannot close before they open."); return; }
      if (hkStart && hkEnd && hkStart > hkEnd) { showError("The hackathon cannot end before it begins."); return; }
      if (appEnd && hkStart && appEnd > hkStart) { showError("Applications must close on or before the hackathon starts."); return; }

      const teamMin = Number(document.getElementById("teamMin").value) || 1;
      const teamMax = Number(document.getElementById("teamMax").value) || 1;
      if (teamMin > teamMax) { showError("Minimum team size cannot exceed the maximum."); return; }

      const payload = {
        id: Number(id),
        hackathonName: name,
        hackathonAbout: document.getElementById("hackathonAbout").value,
        status: document.getElementById("status").value,
        mode: document.getElementById("mode").value,
        venue: document.getElementById("venue").value,
        teamMin: teamMin,
        teamMax: teamMax,
        durationHours: Number(document.getElementById("durationHours").value) || 48,
        seats: Number(document.getElementById("seats").value) || 200,
        // Already saved by the upload/remove itself — sent again so a Save can
        // never quietly revert an image change made moments earlier.
        bannerUrl: window.BannerUpload
          ? window.BannerUpload.getBanner()
          : (document.getElementById("bannerUrl") || {}).value || "",
        applicationStart: appStart,
        applicationEnd: appEnd,
        hackathonStart: hkStart,
        hackathonEnd: hkEnd,
        fields: {
          fullName: document.getElementById("fieldFullName").checked,
          bio: document.getElementById("fieldBio").checked,
          gender: document.getElementById("fieldGender").checked,
          domainExpertise: document.getElementById("fieldDomainExpertise").checked,
          skills: document.getElementById("fieldSkills").checked,
          github: document.getElementById("fieldGithub").checked,
          linkedin: document.getElementById("fieldLinkedin").checked,
          phone: document.getElementById("fieldPhone").checked,
          email: document.getElementById("fieldEmail").checked
        }
      };

      // Blank tiers and unnamed judges are dropped by collect(), so clearing
      // a tier here is how an organiser removes it from the details page.
      if (window.PrizesJudges) {
        const pj = window.PrizesJudges.collect();
        payload.prizes = pj.prizes;
        payload.judges = pj.judges;
      }

      const originalLabel = saveBtn.textContent;
      saveBtn.textContent = "Saving\u2026";
      saveBtn.style.pointerEvents = "none";
      saveBtn.style.opacity = "0.7";

      fetch("api/hackathons_update.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
        .then((res) => res.json().then((body) => ({ ok: res.ok, body })))
        .then(({ ok, body }) => {
          saveBtn.textContent = originalLabel;
          saveBtn.style.pointerEvents = "";
          saveBtn.style.opacity = "";
          if (!ok || !body.success) {
            showError((body && body.error) || "Could not save your changes. Please try again.");
            return;
          }
          window.location.href = "organise_hackathon.html";
        })
        .catch(() => {
          saveBtn.textContent = originalLabel;
          saveBtn.style.pointerEvents = "";
          saveBtn.style.opacity = "";
          showError("Could not reach the server. Is the PHP/MySQL backend running?");
        });
    });
  }

  fetch("api/me.php")
    .then((res) => res.json())
    .then((data) => {
      if (!data.admin) {
        window.location.href = "admin-login.html";
        return Promise.reject(new Error("not logged in"));
      }
      if (navName) navName.textContent = (data.admin.displayName || data.admin.username).toUpperCase();
      if (navAvatar) {
        const src = (data.admin.displayName || data.admin.username || "").trim();
        const parts = src.split(/\s+/).filter(Boolean);
        navAvatar.textContent = (parts.length >= 2 ? (parts[0].charAt(0) + parts[1].charAt(0)) : src.slice(0, 2)).toUpperCase() || "A";
      }
      heWireAdminLogout();

      return fetch("api/hackathons_get.php?id=" + encodeURIComponent(id));
    })
    .then((res) => res.json())
    .then((data) => {
      if (!data || !data.success) {
        showError((data && data.error) || "This hackathon could not be found.");
        if (panel) {
          Array.from(panel.children).forEach((el) => {
            if (el !== errorEl) el.style.display = "none";
          });
        }
        return;
      }
      fillForm(data.hackathon);
      wireSave();
    })
    .catch(() => {});
});
