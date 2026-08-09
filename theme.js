/* =========================================================================
   theme.js — The Coded Cipher
   Two small jobs that have to happen on every page, and would otherwise
   mean hand-editing two dozen HTML files:

     1. Any <img> that fails to load is replaced with a drawn "engraved
        plate" instead of the browser's broken-image icon. The project
        ships no image files at all, so without this the homepage gallery,
        the sponsor row and the team grid are a wall of torn-page glyphs.

     2. The gaslight vignette is injected once, so every screen has a lit
        centre and dark corners without needing markup.

   Purely presentational. If this file fails to load the site still works.
   ========================================================================= */

(function () {
  "use strict";

  var SVG_NS = "http://www.w3.org/2000/svg";

  /* The house mark: a lens held over ciphered text. Same geometry as the
     inline logo in the nav, so the plates and the brand agree. */
  function markSvg(cls) {
    var s = document.createElementNS(SVG_NS, "svg");
    s.setAttribute("viewBox", "0 0 32 32");
    s.setAttribute("fill", "none");
    s.setAttribute("aria-hidden", "true");
    if (cls) s.setAttribute("class", cls);

    var lens = document.createElementNS(SVG_NS, "circle");
    lens.setAttribute("cx", "13");
    lens.setAttribute("cy", "13");
    lens.setAttribute("r", "8.6");
    lens.setAttribute("stroke", "currentColor");
    lens.setAttribute("stroke-width", "1.7");
    s.appendChild(lens);

    var handle = document.createElementNS(SVG_NS, "path");
    handle.setAttribute("d", "M19.3 19.3 L27.5 27.5");
    handle.setAttribute("stroke", "currentColor");
    handle.setAttribute("stroke-width", "2.2");
    handle.setAttribute("stroke-linecap", "round");
    s.appendChild(handle);

    /* Five broken strokes inside the lens — text, magnified past legibility. */
    [
      [8.6, 10.4, 12.9, 10.4],
      [14.7, 10.4, 17.4, 10.4],
      [8.6, 13.0, 11.1, 13.0],
      [12.9, 13.0, 17.4, 13.0],
      [8.6, 15.6, 14.2, 15.6]
    ].forEach(function (c) {
      var l = document.createElementNS(SVG_NS, "line");
      l.setAttribute("x1", c[0]);
      l.setAttribute("y1", c[1]);
      l.setAttribute("x2", c[2]);
      l.setAttribute("y2", c[3]);
      l.setAttribute("stroke", "currentColor");
      l.setAttribute("stroke-width", "1.25");
      l.setAttribute("stroke-linecap", "round");
      l.setAttribute("opacity", "0.72");
      s.appendChild(l);
    });

    return s;
  }

  /* ---------- 1. Failed images become engraved plates ---------- */

  /* A person gets their initials, an organisation gets a crest, a case photo
     gets an evidence card. Anything else falls back to a plain plate. */
  function kindOf(img) {
    if (img.closest(".sponsors-row, .sponsor, .partner")) return "crest";
    if (img.matches(".squad-img, .profile-pic, .avatar, .judge-photo") ||
        img.closest(".squad-card, .judge, .member, .profile-photo")) return "initials";
    if (img.closest(".photo-card, .gallery-item, .evidence")) return "evidence";
    return "plate";
  }

  /* "Ada Lovelace" -> "AL"; "Sponsor 4" -> "S4"; "Figma" -> "FI". Numbers are
     kept because a placeholder name is mostly its number. */
  var HONORIFICS = /^(dr|mr|mrs|ms|miss|prof|professor|sir|dame|lord|lady|rev|inspector|insp|capt|captain|col|sgt|det|detective)$/i;

  function initialsOf(text) {
    var words = text.replace(/[^\p{L}\p{N} ]/gu, " ").trim().split(/\s+/).filter(Boolean);
    var named = words.filter(function (w) { return !HONORIFICS.test(w); });
    if (named.length) words = named;
    if (!words.length) return "?";
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  }

  function plateFor(img) {
    var alt = (img.getAttribute("alt") || "").trim();
    var kind = kindOf(img);

    var plate = document.createElement("div");
    plate.className = "sh-plate sh-plate--" + kind;

    /* Inherit whatever the stylesheet gave the image, so the substitute
       occupies exactly the same box in the grid rather than collapsing. */
    if (img.className) plate.className += " " + img.className;
    var cs = window.getComputedStyle(img);
    if (cs.borderRadius && cs.borderRadius !== "0px") {
      plate.style.borderRadius = cs.borderRadius;
    }
    if (img.width && img.height) {
      plate.style.aspectRatio = img.width + " / " + img.height;
    }

    if (kind === "initials" || kind === "crest") {
      var mono = document.createElement("span");
      mono.className = "sh-plate-initials";
      mono.textContent = initialsOf(alt);
      plate.appendChild(mono);
      if (alt && alt.length <= 30) {
        var name = document.createElement("span");
        name.className = "sh-plate-name";
        name.textContent = alt;
        plate.appendChild(name);
      }
    } else {
      plate.appendChild(markSvg("sh-plate-mark"));
      if (alt && alt.length <= 28) {
        var cap = document.createElement("span");
        cap.className = "sh-plate-label";
        cap.textContent = alt;
        plate.appendChild(cap);
      }
    }

    plate.setAttribute("role", "img");
    plate.setAttribute("aria-label", alt || "Illustration unavailable");
    return plate;
  }

  function swap(img) {
    if (!img.parentNode || img.dataset.shPlated) return;
    img.dataset.shPlated = "1";
    img.parentNode.replaceChild(plateFor(img), img);
  }

  function guardImages(root) {
    (root || document).querySelectorAll("img").forEach(function (img) {
      if (img.dataset.shPlated) return;
      /* Already finished loading and came back empty. */
      if (img.complete && img.naturalWidth === 0) {
        swap(img);
        return;
      }
      img.addEventListener("error", function () {
        swap(img);
      });
    });
  }

  /* Cards are rendered from the API after this script runs, so watch for
     images added later rather than only sweeping once at startup. */
  function watchForImages() {
    if (!("MutationObserver" in window)) return;
    new MutationObserver(function (records) {
      records.forEach(function (r) {
        r.addedNodes.forEach(function (n) {
          if (n.nodeType !== 1) return;
          if (n.tagName === "IMG") guardImages(n.parentNode);
          else if (n.querySelector && n.querySelector("img")) guardImages(n);
        });
      });
    }).observe(document.documentElement, { childList: true, subtree: true });
  }

  /* ---------- 2. Vignette ---------- */

  function addVignette() {
    if (document.querySelector(".sh-vignette")) return;
    if (document.body.hasAttribute("data-no-vignette")) return;
    var v = document.createElement("div");
    v.className = "sh-vignette";
    v.setAttribute("aria-hidden", "true");
    document.body.appendChild(v);
  }

  function init() {
    guardImages(document);
    watchForImages();
    addVignette();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  /* Exposed so pages that draw their own cards can plate an image directly. */
  window.ShTheme = { mark: markSvg, guardImages: guardImages };
})();
