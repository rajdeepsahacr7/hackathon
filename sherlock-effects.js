/* =========================================================================
   The Coded Cipher — index page interactive enhancements
   Scroll reveals, hero parallax + drifting fog, a trailing "detective's
   lens" cursor, ambient embers, gentle 3D tilt on evidence cards and the
   "Ongoing Cases" hackathon cards, and the wax-seal stamp-in. Purely
   additive — if this file fails to load, the page still renders and
   works normally, just without the flourishes.
   ========================================================================= */

(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* ---------- 1. Scroll-reveal: evidence surfaces itself ---------- */
  function initReveal() {
    if (reduceMotion || !("IntersectionObserver" in window)) return;

    var groups = [
      { selector: "#photoGallery .photo-card", stagger: true },
      { selector: ".tracks-grid .track-card", stagger: true },
      { selector: ".sponsors-row .sponsor-logo", stagger: true },
      { selector: "#squadGrid .squad-card", stagger: true },
      { selector: ".endeavour-grid .endeavour-card", stagger: true },
      { selector: ".stats-bar .stat-item", stagger: true },
      { selector: ".section-eyebrow, .section-heading, .section-image, .consult-form", stagger: false }
    ];

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );

    groups.forEach(function (group) {
      var els = document.querySelectorAll(group.selector);
      els.forEach(function (el, i) {
        el.classList.add("reveal-el");
        if (group.stagger) {
          el.style.setProperty("--reveal-delay", Math.min(i * 0.08, 0.48) + "s");
        }
        observer.observe(el);
      });
    });
  }

  /* ---------- 2. Hero parallax: the fog recedes as you descend ---------- */
  function initParallax() {
    if (reduceMotion) return;

    var container = document.querySelector(".slideshow-container");
    var imgs = document.querySelectorAll(".mySlides img");
    var captions = document.querySelectorAll(".mySlides .text");
    var cue = document.querySelector(".scroll-cue");
    if (!container || !imgs.length) return;

    var ticking = false;

    function update() {
      var offset = Math.min(Math.max(window.scrollY, 0), 480);
      var shift = offset * 0.22;
      var tilt = Math.min(offset * 0.015, 7);

      for (var i = 0; i < imgs.length; i++) {
        imgs[i].style.transform =
          "translateY(" + shift + "px) scale(1.06) rotateX(-" + tilt + "deg)";
      }
      for (var j = 0; j < captions.length; j++) {
        captions[j].style.transform =
          "translate(-50%, calc(-50% + " + shift * -0.6 + "px))";
        captions[j].style.opacity = String(Math.max(1 - offset / 420, 0));
      }
      if (cue) {
        cue.style.opacity = String(Math.max(0.8 - offset / 150, 0));
      }
      ticking = false;
    }

    window.addEventListener(
      "scroll",
      function () {
        if (!ticking) {
          window.requestAnimationFrame(update);
          ticking = true;
        }
      },
      { passive: true }
    );

    update();
  }

  /* ---------- 3. Drifting embers: gaslight dust across the page ---------- */
  function initEmbers() {
    if (reduceMotion) return;

    var field = document.createElement("div");
    field.className = "ember-field";
    field.setAttribute("aria-hidden", "true");

    var count = window.innerWidth < 700 ? 9 : 18;
    for (var i = 0; i < count; i++) {
      var e = document.createElement("span");
      e.className = "ember";
      var size = (2 + Math.random() * 2.4).toFixed(1);
      var duration = (16 + Math.random() * 16).toFixed(1);
      e.style.left = (Math.random() * 100).toFixed(1) + "vw";
      e.style.width = size + "px";
      e.style.height = size + "px";
      e.style.setProperty("--drift", (Math.random() * 50 - 25).toFixed(0) + "px");
      e.style.animationDuration = duration + "s";
      e.style.animationDelay = "-" + (Math.random() * duration).toFixed(1) + "s";
      field.appendChild(e);
    }
    document.body.appendChild(field);
  }

  /* ---------- 4. The Detective's Lens: a trailing glass ---------- */
  function initLens() {
    if (reduceMotion || !canHover) return;

    var lens = document.createElement("div");
    lens.className = "detective-lens";
    lens.setAttribute("aria-hidden", "true");
    lens.innerHTML = '<span class="detective-lens-glass"></span>';
    document.body.appendChild(lens);

    var mx = window.innerWidth / 2,
      my = window.innerHeight / 2;
    var lx = mx,
      ly = my;
    var active = false;

    window.addEventListener(
      "mousemove",
      function (e) {
        mx = e.clientX;
        my = e.clientY;
        if (!active) {
          active = true;
          lx = mx;
          ly = my;
          lens.classList.add("is-visible");
        }
      },
      { passive: true }
    );

    document.addEventListener("mouseleave", function () {
      lens.classList.remove("is-visible");
    });

    function loop() {
      lx += (mx - lx) * 0.16;
      ly += (my - ly) * 0.16;
      lens.style.transform =
        "translate3d(" + lx + "px, " + ly + "px, 0) translate(-50%, -50%)";
      window.requestAnimationFrame(loop);
    }
    loop();

    var evidence = document.querySelectorAll(
      ".photo-card, .track-card, .squad-card, .sponsor-logo, .case-seal"
    );
    evidence.forEach(function (el) {
      el.addEventListener("mouseenter", function () {
        lens.classList.add("is-examining");
      });
      el.addEventListener("mouseleave", function () {
        lens.classList.remove("is-examining");
      });
    });
  }

  /* ---------- 5. Gentle 3D tilt for evidence cards ---------- */
  function initTilt(selector, maxTilt) {
    if (reduceMotion || !canHover) return;

    document.querySelectorAll(selector).forEach(function (card) {
      card.style.willChange = "transform";

      card.addEventListener("mouseenter", function () {
        card.style.transition = "transform 0.15s ease-out";
      });

      card.addEventListener("mousemove", function (e) {
        var rect = card.getBoundingClientRect();
        var px = (e.clientX - rect.left) / rect.width - 0.5;
        var py = (e.clientY - rect.top) / rect.height - 0.5;
        var rotateY = px * maxTilt * 2;
        var rotateX = py * -maxTilt * 2;
        card.style.transform =
          "perspective(1000px) scale(1.035) rotateX(" +
          rotateX +
          "deg) rotateY(" +
          rotateY +
          "deg)";
      });

      card.addEventListener("mouseleave", function () {
        card.style.transition = "transform 0.5s ease";
        card.style.transform =
          "perspective(1000px) scale(1) rotateX(0deg) rotateY(0deg)";
      });
    });
  }

  /* ---------- 5b. Gentle 3D tilt for the case cards (loaded async) ----------
     The hackathon cards on the homepage aren't in the DOM yet at
     DOMContentLoaded — index-hackathons.js injects them once the API
     responds. So instead of attaching listeners to cards directly (like
     initTilt does above), this listens on the grid itself and works out
     which card the cursor is over. That way the tilt just works whenever
     cards show up, without this file needing to know anything about the
     fetch/render timing in index-hackathons.js. */
  function initTiltDelegated(containerSelector, cardSelector, maxTilt) {
    if (reduceMotion || !canHover) return;

    var container = document.querySelector(containerSelector);
    if (!container) return;

    var REST = "perspective(1200px) scale(1) translateY(0) rotateX(0deg) rotateY(0deg)";
    var activeCard = null;

    function settle(card) {
      card.style.transition = "transform 0.5s ease";
      card.style.transform = REST;
    }

    container.addEventListener("mousemove", function (e) {
      var card = e.target.closest ? e.target.closest(cardSelector) : null;

      if (!card || !container.contains(card)) {
        if (activeCard) {
          settle(activeCard);
          activeCard = null;
        }
        return;
      }

      if (card !== activeCard) {
        if (activeCard) settle(activeCard);
        card.style.willChange = "transform";
        card.style.transition = "transform 0.15s ease-out";
        activeCard = card;
      }

      var rect = card.getBoundingClientRect();
      var px = (e.clientX - rect.left) / rect.width - 0.5;
      var py = (e.clientY - rect.top) / rect.height - 0.5;
      var rotateY = px * maxTilt * 2;
      var rotateX = py * -maxTilt * 2;

      card.style.transform =
        "perspective(1200px) scale(1.06) translateY(-10px) rotateX(" +
        rotateX +
        "deg) rotateY(" +
        rotateY +
        "deg)";
    });

    container.addEventListener("mouseleave", function () {
      if (activeCard) {
        settle(activeCard);
        activeCard = null;
      }
    });
  }

  /* ---------- 6. Wax-seal stamp-in ---------- */
  function initSeal() {
    var seal = document.querySelector(".case-seal");
    if (!seal) return;

    if (reduceMotion || !("IntersectionObserver" in window)) {
      seal.classList.add("in-view");
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.4 }
    );
    observer.observe(seal);
  }

  document.addEventListener("DOMContentLoaded", function () {
    initReveal();
    initParallax();
    initEmbers();
    initLens();
    initTilt(".photo-card", 5);
    initTilt(".squad-card", 5);
    initTiltDelegated("#tracksGrid", ".track-card", 6);
    initSeal();
  });
})();
