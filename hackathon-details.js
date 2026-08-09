function hdEsc(s) { const d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; }

function hdDateRange(start, end) {
  if (!start && !end) return 'TBA';
  const opts = { month: 'long', day: 'numeric', year: 'numeric' };
  const fmt = (d) => new Date(d + 'T00:00:00').toLocaleDateString(undefined, opts);
  return (start && end) ? fmt(start) + ' \u2013 ' + fmt(end) : fmt(start || end);
}

/*
 * Prizes and judges are organiser-entered (create wizard step 3 / the edit
 * page) and stored as JSON, so both may be absent, partly filled, or in any
 * order. Each section stays hidden until there is something real to show, and
 * every value goes through hdEsc() on the way in.
 */
function hdShowSection(sel, show) {
  const section = document.querySelector(sel);
  if (section) section.hidden = !show;
}

// So a 1st/2nd/3rd set reads in that order however it comes back.
const HD_PLACE_ORDER = ['first', 'second', 'third'];

function hdPlaceRank(place) {
  const p = String(place || '').toLowerCase();
  for (let i = 0; i < HD_PLACE_ORDER.length; i++) {
    if (p.indexOf(HD_PLACE_ORDER[i]) !== -1) return i;
  }
  return HD_PLACE_ORDER.length;
}

function hdRenderPrizes(prizes) {
  const grid = document.querySelector('.hd-prizes-grid');
  if (!grid) return;

  const list = (Array.isArray(prizes) ? prizes : [])
    .filter((p) => p && (p.amount || p.award || (p.perks || []).length))
    .map((p, i) => ({ p: p, i: i }))
    .sort((a, b) => (hdPlaceRank(a.p.place) - hdPlaceRank(b.p.place)) || (a.i - b.i))
    .map((x) => x.p);

  if (!list.length) { hdShowSection('.hd-prizes-section', false); return; }
  hdShowSection('.hd-prizes-section', true);

  // One prize shouldn't stretch across the full three-column grid.
  grid.style.gridTemplateColumns = 'repeat(' + Math.min(list.length, 3) + ', 1fr)';

  grid.innerHTML = list.map((p, idx) => {
    const perks = (p.perks || []).filter(Boolean);
    return '<div class="hd-prize-card' + (idx === 0 ? ' featured' : '') + '">' +
      (p.place  ? '<p class="hd-prize-place">' + hdEsc(p.place) + '</p>' : '') +
      (p.icon   ? '<div class="hd-prize-icon">' + hdEsc(hdIcon(p.icon)) + '</div>' : '') +
      (p.amount ? '<p class="hd-prize-amount">' + hdEsc(p.amount) + '</p>' : '') +
      (p.award  ? '<p class="hd-prize-award">' + hdEsc(p.award) + '</p>' : '') +
      (perks.length
        ? '<ul class="hd-prize-perks">' +
            perks.map((k) => '<li>' + hdEsc(k) + '</li>').join('') +
          '</ul>'
        : '') +
    '</div>';
  }).join('');
}

/* Honorifics are not part of a name, so "Dr John H. Watson" should read JW
   rather than DJ. Single-letter middle initials are dropped for the same
   reason: the last name is more identifying than the middle one. */
const HD_HONORIFICS = /^(dr|mr|mrs|ms|miss|prof|professor|sir|dame|lord|lady|rev|inspector|insp|capt|captain|col|sgt|det|detective)\.?$/i;

/* Prize emblems used to be colour emoji. Rows saved then still hold them, so
   they are translated to the engraved Roman-numeral set at render time. */
const HD_LEGACY_ICONS = {
  "\u{1F3C6}": "\u2605", "\u{1F947}": "I", "\u{1F948}": "II", "\u{1F949}": "III",
  "\u{1F50E}": "\u2726", "\u{1F50D}": "\u2726", "\u{1F511}": "\u00A7", "\u{1F4DC}": "\u00A7"
};

function hdIcon(v) {
  const s = String(v == null ? "" : v).trim();
  return HD_LEGACY_ICONS[s] || s;
}

function hdInitials(name) {
  let parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  parts = parts.filter(function (p) { return !HD_HONORIFICS.test(p); });
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  const first = parts[0];
  const last = parts[parts.length - 1];
  return (first.charAt(0) + last.charAt(0)).toUpperCase();
}

function hdRenderJudges(judges) {
  const grid = document.querySelector('.hd-judges-grid');
  if (!grid) return;

  const list = (Array.isArray(judges) ? judges : []).filter((j) => j && j.name);
  if (!list.length) { hdShowSection('.hd-judges-section', false); return; }
  hdShowSection('.hd-judges-section', true);

  grid.style.gridTemplateColumns = 'repeat(' + Math.min(list.length, 3) + ', 1fr)';

  // No judge photo uploads yet, so everyone gets an engraved initials disc.
  grid.innerHTML = list.map((j) =>
    '<div class="hd-judge-card">' +
      (j.photo
        ? '<img src="' + hdEsc(j.photo) + '" alt="" class="hd-judge-photo">'
        : '<div class="hd-judge-photo hd-judge-initials">' + hdEsc(hdInitials(j.name)) + '</div>') +
      '<p class="hd-judge-name">' + hdEsc(j.name) + '</p>' +
      (j.title ? '<p class="hd-judge-title">' + hdEsc(j.title) + '</p>' : '') +
    '</div>').join('');
}

function hdRenderStats(h) {
  const row = document.querySelector('.hd-stats-row');
  if (!row) return;
  row.innerHTML =
    '<div class="hd-stat"><p class="hd-stat-number">' + h.teamMin + '-' + h.teamMax +
      '</p><p class="hd-stat-label">members per team</p></div>' +
    '<div class="hd-stat featured"><p class="hd-stat-number">' + h.durationHours +
      'hrs</p><p class="hd-stat-label">Duration</p></div>' +
    '<div class="hd-stat"><p class="hd-stat-number">' + h.seats +
      '</p><p class="hd-stat-label">Seats</p></div>';
}

/*
 * Paints the organiser's uploaded card image across the hero.
 *
 * The image has to go onto the .sh-scene layer rather than the <section>: the
 * drawn cipher wall is absolutely positioned over the whole hero with its own
 * opaque background colour, so anything set on the section behind it is never
 * seen. Adding .has-banner to the hero retires the drawn wall (see
 * hackathon-details.css) and leaves the fog drifting over the photograph, which
 * keeps this hero consistent with the ones on the home page.
 *
 * With no upload we simply leave the drawn wall alone, so a case without a
 * banner still gets a proper hero instead of an empty black band.
 */
function hdApplyHeroBanner(bannerUrl) {
  if (!bannerUrl) return;

  const hero  = document.getElementById('hdHero');
  const scene = document.getElementById('hdHeroScene');
  if (!hero || !scene) return;

  // Single quotes would otherwise close the url('...') early.
  const safeUrl = String(bannerUrl).replace(/'/g, '%27');

  scene.style.backgroundImage =
    'linear-gradient(180deg, rgba(10,8,6,0.45) 0%, rgba(10,8,6,0.3) 45%, rgba(10,8,6,0.82) 100%), ' +
    "url('" + safeUrl + "')";

  hero.classList.add('has-banner');
}

document.addEventListener('DOMContentLoaded', () => {
  const id = new URLSearchParams(window.location.search).get('id');
  const titleEl = document.getElementById('hdTitle');
  const descEl  = document.getElementById('hdDescription');
  const regEl   = document.getElementById('hdRegistrationDates');
  const hackEl  = document.getElementById('hdHackathonDates');
  const venueEl = document.getElementById('hdVenue');
  const applyBtn = document.getElementById('hdApplyBtn');

  function bail(msg) {
    if (titleEl) titleEl.textContent = 'Hackathon not found';
    if (descEl)  descEl.textContent = msg;
    if (applyBtn) applyBtn.style.display = 'none';
  }

  if (!id) { bail('No hackathon was specified. Head back to the list and pick a case to investigate.'); return; }

  fetch('api/hackathons_get.php?id=' + encodeURIComponent(id), { credentials: 'same-origin' })
    .then((r) => r.json().then((d) => ({ ok: r.ok, data: d })))
    .then(({ ok, data }) => {
      if (!ok || !data.success) { bail((data && data.error) || 'This hackathon could not be found.'); return; }

      const h = data.hackathon;
      document.title = h.name + ' | The Coded Cipher';
      if (titleEl) titleEl.textContent = h.name;
      if (descEl)  descEl.textContent = h.about || '';
      if (regEl)   regEl.textContent  = 'Date Of Registration — ' + hdDateRange(h.applicationStart, h.applicationEnd);
      if (hackEl)  hackEl.textContent = 'Date Of Hackathon — ' + hdDateRange(h.hackathonStart, h.hackathonEnd);
      if (venueEl) venueEl.textContent = h.mode === 'online'
        ? 'Held online' : (h.venue ? 'Venue — ' + h.venue : 'Venue — TBA');
      hdApplyHeroBanner(h.bannerUrl);

      hdRenderStats(h);
      hdRenderPrizes(h.prizes);
      hdRenderJudges(h.judges);

      if (!applyBtn) return;
      if (h.myApplication) {
        applyBtn.textContent = 'Application submitted \u00b7 ' + h.myApplication.referral_code;
        applyBtn.href = 'my-applications.html';
      } else if (!h.applicationsOpen) {
        applyBtn.textContent = 'Applications are closed';
        applyBtn.classList.add('is-closed');
        applyBtn.href = '#';
        applyBtn.style.opacity = '0.5';
        applyBtn.style.pointerEvents = 'none';
      } else {
        applyBtn.href = 'application-about.html?hackathon=' + encodeURIComponent(h.id);
      }
    })
    .catch(() => bail('Could not reach the server. Is the PHP/MySQL backend running?'));
});
