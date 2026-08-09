// Registrations table (admin-registrations.html). Loads real data from
// api/applications_list.php, renders rows, and wires the trash icon to
// actually delete via api/applications_delete.php.

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
}

function saLoadRegistrations() {
  const tbody = document.getElementById("saTableBody");
  const emptyRow = document.getElementById("saEmptyRow");
  if (!tbody) return;

  fetch("api/applications_list.php")
    .then((res) => res.json())
    .then((data) => {
      if (!data.success) return;

      tbody.innerHTML = "";

      if (!data.applications.length) {
        tbody.innerHTML = '<tr id="saEmptyRow"><td colspan="4">No registrations yet.</td></tr>';
        return;
      }

      data.applications.forEach((app) => {
        const tr = document.createElement("tr");
        tr.dataset.label = `${app.participantName}'s registration`;
        tr.dataset.id = app.id;
        tr.innerHTML = `
          <td>${escapeHtml(app.hackathonName)}</td>
          <td>${escapeHtml(app.participantName)}</td>
          <td>${escapeHtml(app.referralCode)}</td>
          <td class="sa-action-cell">
            <button class="sa-action-btn sa-delete-btn" title="Delete">&#128465;&#65039;</button>
            <a href="view-registration.html?id=${encodeURIComponent(app.id)}" class="sa-action-btn" title="View">&#128065;&#65039;</a>
          </td>
        `;
        tbody.appendChild(tr);
      });

      wireDeleteButtons();
    })
    .catch(() => {
      if (emptyRow) emptyRow.querySelector("td").textContent = "Could not reach the server. Is the PHP/MySQL backend running?";
    });
}

function wireDeleteButtons() {
  document.querySelectorAll(".sa-delete-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const row = btn.closest("tr");
      const label = row.dataset.label || "this entry";
      const id = row.dataset.id;
      const confirmed = window.confirm(`Delete ${label}? This cannot be undone.`);
      if (!confirmed) return;

      fetch("api/applications_delete.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      })
        .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
        .then(({ ok, data }) => {
          if (ok && data.success) {
            row.classList.add("sa-row-removed");
            setTimeout(() => row.remove(), 300);
          } else {
            alert((data && data.error) || "Could not delete this registration.");
          }
        })
        .catch(() => alert("Could not reach the server."));
    });
  });
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
  // Admin-only page.
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
      saLoadRegistrations();
    })
    .catch(() => {});
});
