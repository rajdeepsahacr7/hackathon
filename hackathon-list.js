// Loads real hackathons from api/hackathons_list.php and renders them
// into #hackGrid on hackathons.html.

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
}

// Paints the admin-uploaded card image behind a case card, with a dark gradient
// over it so the gold-framed overlay stays readable on any photo. No image means
// a .no-banner class and the CSS parchment fallback.
function applyCardBanner(card, bannerUrl) {
  if (!bannerUrl) {
    card.classList.add("no-banner");
    return;
  }
  card.style.backgroundImage =
    "linear-gradient(180deg, rgba(13,10,7,0.15) 0%, rgba(13,10,7,0.55) 55%, rgba(13,10,7,0.88) 100%), " +
    "url('" + String(bannerUrl).replace(/'/g, "%27") + "')";
}

// ---------------------------------------------------------------------------
// Pointer-tracked 3D tilt for a case card.
//
// Cards are built at runtime from the API, so the handlers are attached per
// card as it is created rather than by a one-off querySelectorAll at load.
// Movement is read on pointermove and applied inside requestAnimationFrame so
// several cards under a fast-moving cursor never fight over layout.
// ---------------------------------------------------------------------------

const TILT_MAX = 8;        // degrees of rotation at the card's edge
const TILT_LIFT = 10;      // px the card rises towards the viewer
const TILT_PARALLAX = 7;   // px the overlay panel drifts against the tilt

const prefersReducedMotion =
  window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Whether to tilt is decided per event from `pointerType` rather than up front
// from a `(hover: hover) and (pointer: fine)` media query. Some browsers report
// that query as false on a genuine mouse, which would silently kill the effect
// for those visitors; asking the event itself is accurate every time. Touch and
// pen still fall through untouched, so the card stays flat where hover has no
// meaning.
function isMouseLike(e) {
  return !e.pointerType || e.pointerType === "mouse";
}

function attachCardTilt(card) {
  if (prefersReducedMotion) return;

  const overlay = card.querySelector(".hack-overlay");
  let frame = null;
  let pending = null;

  function render() {
    frame = null;
    if (!pending) return;

    const { px, py } = pending;

    // px / py run -0.5 (left/top edge) to 0.5 (right/bottom edge).
    const rotateY = px * TILT_MAX * 2;
    const rotateX = py * -TILT_MAX * 2;

    card.style.transform =
      `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) ` +
      `rotateY(${rotateY.toFixed(2)}deg) scale(1.035) translateY(-${TILT_LIFT}px)`;

    if (overlay) {
      // Opposite sign to the rotation, so the panel appears to hang in front.
      overlay.style.setProperty("--ox", `${(-px * TILT_PARALLAX).toFixed(2)}px`);
      overlay.style.setProperty("--oy", `${(-py * TILT_PARALLAX).toFixed(2)}px`);
    }
  }

  card.addEventListener("pointerenter", (e) => {
    if (!isMouseLike(e)) return;
    card.classList.add("is-tilting");
    card.style.setProperty("--glare", "1");
  });

  card.addEventListener("pointermove", (e) => {
    if (!isMouseLike(e)) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // The glare tracks the raw cursor position in the card's own coordinates.
    card.style.setProperty("--mx", `${x.toFixed(1)}px`);
    card.style.setProperty("--my", `${y.toFixed(1)}px`);

    pending = { px: x / rect.width - 0.5, py: y / rect.height - 0.5 };
    if (frame === null) frame = requestAnimationFrame(render);
  });

  function reset() {
    if (frame !== null) {
      cancelAnimationFrame(frame);
      frame = null;
    }
    pending = null;
    card.classList.remove("is-tilting");
    card.style.setProperty("--glare", "0");
    card.style.transform =
      "perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1) translateY(0)";
    if (overlay) {
      overlay.style.setProperty("--ox", "0px");
      overlay.style.setProperty("--oy", "0px");
    }
  }

  card.addEventListener("pointerleave", reset);
  // A dragged pointer or a lost capture would otherwise leave a card stuck
  // mid-tilt, so cancellation resets it too.
  card.addEventListener("pointercancel", reset);
}

document.addEventListener("DOMContentLoaded", () => {
  const grid = document.getElementById("hackGrid");
  const emptyState = document.getElementById("hackEmptyState");
  if (!grid) return;

  fetch("api/hackathons_list.php")
    .then((res) => res.json())
    .then((data) => {
      if (!data.success || !data.hackathons.length) {
        if (emptyState) emptyState.style.display = "block";
        return;
      }

      data.hackathons.forEach((h) => {
        const card = document.createElement("div");
        card.className = "hack-card";
        applyCardBanner(card, h.bannerUrl);

        card.innerHTML = `
          <div class="hack-overlay">
            <h3 class="hack-title">${escapeHtml(h.name)}</h3>
            <p class="hack-desc">${escapeHtml(h.about || "")}</p>
            <a href="hackathon-details.html?id=${encodeURIComponent(h.id)}" class="hack-btn">Apply Now</a>
          </div>
        `;
        grid.appendChild(card);
        attachCardTilt(card);
      });
    })
    .catch(() => {
      if (emptyState) {
        emptyState.textContent = "Could not reach the server. Is the PHP/MySQL backend running?";
        emptyState.style.display = "block";
      }
    });
});
