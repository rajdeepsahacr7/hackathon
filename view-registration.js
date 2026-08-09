// Loads the registration named by ?id=<applicationId> from
// api/applications_get.php and fills in view-registration.html.

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
      loadRegistration();
    })
    .catch(() => {});

  function loadRegistration() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    if (!id) {
      document.querySelector(".ad-wrap").insertAdjacentHTML("afterbegin", "<p>No registration was specified.</p>");
      return;
    }

    fetch(`api/applications_get.php?id=${encodeURIComponent(id)}`)
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok || !data.success) {
          document.querySelector(".ad-wrap").insertAdjacentHTML("afterbegin", `<p>${(data && data.error) || "Registration not found."}</p>`);
          return;
        }

        const app = data.application;
        document.getElementById("participantName").value = `${app.firstName || ""} ${app.lastName || ""}`.trim();
        document.getElementById("githubUsername").value = app.githubUsername || "";
        document.getElementById("linkedinUsername").value = app.linkedinUsername || "";
        document.getElementById("phoneNumber").value = app.phoneNumber || "";
        document.getElementById("emailAddress").value = app.emailAddress || "";
        document.getElementById("address").value = app.address || "";

        const skillsRow = document.getElementById("vrSkillsRow");
        if (skillsRow) {
          skillsRow.innerHTML = "";
          if (app.skills && app.skills.length) {
            app.skills.forEach((skill) => {
              const span = document.createElement("span");
              span.className = "vr-skill-tag";
              span.textContent = skill;
              skillsRow.appendChild(span);
            });
          } else {
            skillsRow.textContent = "None listed.";
          }
        }
      })
      .catch(() => {
        document.querySelector(".ad-wrap").insertAdjacentHTML("afterbegin", "<p>Could not reach the server.</p>");
      });
  }
});
