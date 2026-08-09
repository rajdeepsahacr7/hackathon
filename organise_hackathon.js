// Organiser dashboard (organise_hackathon.html): loads the logged-in
// admin's real hackathons from api/hackathons_list.php?mine=1, renders
// them as "case cards", and keeps the original mouse-tracking 3D tilt
// effect on each card.

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
}

function wireTilt(card) {
  const maxTilt = 8;

  card.addEventListener("mouseenter", () => {
    card.style.transition = "transform 0.1s ease-out";
  });

  card.addEventListener("mousemove", (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const percentX = x / rect.width - 0.5;
    const percentY = y / rect.height - 0.5;

    const rotateY = percentX * maxTilt * 2;
    const rotateX = percentY * -maxTilt * 2;

    card.style.transform =
      `perspective(1200px) scale(1.04) translateY(-8px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  });

  card.addEventListener("mouseleave", () => {
    card.style.transition = "transform 0.5s ease";
    card.style.transform =
      "perspective(1200px) scale(1) translateY(0) rotateX(0deg) rotateY(0deg)";
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
  const navName = document.getElementById("ohNavName");
  const navAvatar = document.getElementById("navUserAvatar");
  const grid = document.getElementById("ohCasesGrid");
  const emptyState = document.getElementById("ohEmptyState");

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

      return fetch("api/hackathons_list.php?mine=1").then((res) => res.json());
    })
    .then((data) => {
      if (!data || !data.success || !grid) return;

      if (!data.hackathons.length) {
        if (emptyState) emptyState.style.display = "block";
        return;
      }

      const statusLabels = { draft: "Draft", published: "Published", closed: "Closed" };

      data.hackathons.forEach((h, i) => {
        const card = document.createElement("div");
        card.className = "oh-case-card";

        // The uploaded card image goes in its own layer behind the case-file
        // content, dimmed hard so the cream title and grey body text stay
        // readable on top of any photo. No image = the plain folder colour.
        if (h.bannerUrl) {
          card.classList.add("has-banner");
          const bg = document.createElement("span");
          bg.className = "oh-case-banner";
          bg.setAttribute("aria-hidden", "true");
          bg.style.backgroundImage = "url('" + String(h.bannerUrl).replace(/'/g, "%27") + "')";
          card.appendChild(bg);
        }

        const inner = document.createElement("div");
        inner.className = "oh-case-body";
        inner.innerHTML = `
          <span class="oh-case-tab">Case N&#186; ${String(i + 1).padStart(2, "0")}</span>
          <span class="oh-case-stamp">${escapeHtml(statusLabels[h.status] || h.status)}</span>
          <div class="oh-case-emblem-wrap">
            <img src="images/shadow-syntax-emblem.png" alt="" class="oh-case-emblem">
          </div>
          <h3 class="oh-case-title">${escapeHtml(h.name)}</h3>
          <p class="oh-case-desc">${escapeHtml(h.about || "")}</p>
          <div class="oh-case-actions">
            <a href="hackathon-details.html?id=${encodeURIComponent(h.id)}" class="oh-case-cta">Examine Case &#8594;</a>
            <a href="hackathon-edit.html?id=${encodeURIComponent(h.id)}" class="oh-case-edit-btn">Edit Case</a>
          </div>
        `;
        card.appendChild(inner);
        grid.appendChild(card);
        wireTilt(card);
      });
    })
    .catch(() => {
      if (emptyState) {
        emptyState.textContent = "Could not reach the server. Is the PHP/MySQL backend running?";
        emptyState.style.display = "block";
      }
    });
});
