// Loads real, published hackathons from api/hackathons_list.php and renders
// them into #tracksGrid in the "Ongoing Cases" section of index.html — so a
// newly created hackathon shows up on the homepage as soon as it's published,
// instead of the old hardcoded placeholder cards.

function ihEscapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
}

// Keep the homepage teaser short — link out to the full list for the rest.
const IH_MAX_CARDS = 6;

// Paints the admin-uploaded card image behind a card. The dark gradient on top
// of it is what keeps the gold-framed title/description overlay readable no
// matter how bright or busy the uploaded photo is. With no image, the card gets
// a .no-banner class and falls back to the CSS parchment texture.
function ihApplyBanner(card, bannerUrl) {
  if (!bannerUrl) {
    card.classList.add("no-banner");
    return;
  }
  card.style.backgroundImage =
    "linear-gradient(180deg, rgba(13,10,7,0.15) 0%, rgba(13,10,7,0.55) 55%, rgba(13,10,7,0.88) 100%), " +
    "url('" + String(bannerUrl).replace(/'/g, "%27") + "')";
}

document.addEventListener("DOMContentLoaded", () => {
  const grid = document.getElementById("tracksGrid");
  const emptyState = document.getElementById("tracksEmptyState");
  const viewAllWrap = document.getElementById("tracksViewAllWrap");
  if (!grid) return;

  fetch("api/hackathons_list.php")
    .then((res) => res.json())
    .then((data) => {
      if (!data.success || !data.hackathons.length) {
        if (emptyState) emptyState.style.display = "block";
        return;
      }

      if (viewAllWrap && data.hackathons.length > IH_MAX_CARDS) {
        viewAllWrap.style.display = "block";
      }

      data.hackathons.slice(0, IH_MAX_CARDS).forEach((h) => {
        const card = document.createElement("div");
        card.className = "track-card";
        ihApplyBanner(card, h.bannerUrl);

        card.innerHTML = `
          <div class="track-overlay">
            <h3 class="track-title">${ihEscapeHtml(h.name)}</h3>
            <p class="track-desc">${ihEscapeHtml(h.about || "")}</p>
            <a href="hackathon-details.html?id=${encodeURIComponent(h.id)}" class="track-btn">Apply Now</a>
          </div>
        `;
        grid.appendChild(card);
      });
    })
    .catch(() => {
      if (emptyState) {
        emptyState.textContent = "Could not reach the server. Is the PHP/MySQL backend running?";
        emptyState.style.display = "block";
      }
    });
});
