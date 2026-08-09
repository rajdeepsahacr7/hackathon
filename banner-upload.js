// Banner image picker — the image that sits behind a hackathon's card on
// index.html / hackathons.html / organise_hackathon.html, and behind the hero
// on hackathon-details.html.
//
// Used by two pages, which behave slightly differently:
//
//   hackathon-basics.html (create wizard) — the hackathon doesn't exist yet, so
//     the file is uploaded straight away with no id and the returned URL is
//     parked in the hidden #bannerUrl input. hackathon-create.js persists that
//     to localStorage like every other field and posts it on "Finish Setup".
//
//   hackathon-edit.html — the id is known, so the upload attaches the image to
//     the hackathon immediately and "Remove image" clears it immediately. The
//     hidden input is kept in sync anyway so a later Save can't undo it.
//
// Expects the markup block in both pages (see .hc-banner-group) and exposes
// window.BannerUpload for hackathon-edit.js to call once it has loaded the
// hackathon and knows the id + current image.

window.BannerUpload = (function () {
  "use strict";

  var MAX_BYTES = 4 * 1024 * 1024;
  var ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

  var els = {};
  var hackathonId = 0;
  var busy = false;

  function status(msg, kind) {
    if (!els.status) return;
    els.status.textContent = msg || "";
    els.status.className = "bn-status" + (kind ? " bn-status-" + kind : "");
  }

  // Paint the preview from a URL (a stored uploads/banners path, or a local
  // object URL while an upload is still in flight).
  function paint(url) {
    if (!els.preview) return;
    if (url) {
      els.preview.style.backgroundImage = "url('" + String(url).replace(/'/g, "%27") + "')";
      els.preview.setAttribute("data-empty", "false");
      if (els.removeBtn) els.removeBtn.hidden = false;
      if (els.chooseBtn) els.chooseBtn.textContent = "Replace image";
    } else {
      els.preview.style.backgroundImage = "";
      els.preview.setAttribute("data-empty", "true");
      if (els.removeBtn) els.removeBtn.hidden = true;
      if (els.chooseBtn) els.chooseBtn.textContent = "Choose image";
    }
  }

  function setValue(url) {
    if (els.hidden) els.hidden.value = url || "";
    paint(url || "");
  }

  function setBusy(on) {
    busy = on;
    [els.chooseBtn, els.removeBtn].forEach(function (b) {
      if (!b) return;
      b.classList.toggle("bn-btn-busy", on);
    });
    if (els.file) els.file.disabled = on;
  }

  function upload(file) {
    if (busy) return;

    // Cheap client-side checks first, so an obviously wrong file never costs a
    // round trip. banner_upload.php re-checks all of this properly server-side.
    if (ALLOWED.indexOf(file.type) === -1) {
      status("That file type isn't supported. Use a JPG, PNG, WebP, or GIF.", "error");
      return;
    }
    if (file.size > MAX_BYTES) {
      status("That image is " + (file.size / 1048576).toFixed(1) + " MB. Please keep it under 4 MB.", "error");
      return;
    }

    // Show the chosen file right away rather than waiting on the network.
    var localUrl = window.URL && window.URL.createObjectURL ? window.URL.createObjectURL(file) : "";
    if (localUrl) paint(localUrl);

    var form = new FormData();
    form.append("banner", file);
    if (hackathonId > 0) form.append("id", String(hackathonId));

    setBusy(true);
    status("Uploading\u2026");

    fetch("api/banner_upload.php", { method: "POST", body: form, credentials: "same-origin" })
      .then(function (res) { return res.json().then(function (body) { return { ok: res.ok, body: body }; }); })
      .then(function (r) {
        setBusy(false);
        if (localUrl && window.URL.revokeObjectURL) window.URL.revokeObjectURL(localUrl);

        if (!r.ok || !r.body.success) {
          setValue(els.hidden ? els.hidden.value : "");   // roll the preview back
          status((r.body && r.body.error) || "That image could not be uploaded.", "error");
          return;
        }
        setValue(r.body.bannerUrl);
        status(r.body.attached
          ? "Image uploaded and applied to this case."
          : "Image uploaded \u2014 it will be applied when you finish setup.", "ok");
      })
      .catch(function () {
        setBusy(false);
        if (localUrl && window.URL.revokeObjectURL) window.URL.revokeObjectURL(localUrl);
        setValue(els.hidden ? els.hidden.value : "");
        status("Could not reach the server. Is the PHP/MySQL backend running?", "error");
      })
      .then(function () { if (els.file) els.file.value = ""; });   // allow re-picking the same file
  }

  function remove() {
    if (busy) return;

    // Nothing saved server-side yet (create wizard) — just forget it locally.
    if (hackathonId <= 0) {
      setValue("");
      status("Image removed. This card will use the default look.", "ok");
      return;
    }

    setBusy(true);
    status("Removing\u2026");

    fetch("api/banner_delete.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ id: hackathonId })
    })
      .then(function (res) { return res.json().then(function (body) { return { ok: res.ok, body: body }; }); })
      .then(function (r) {
        setBusy(false);
        if (!r.ok || !r.body.success) {
          status((r.body && r.body.error) || "The image could not be removed.", "error");
          return;
        }
        setValue("");
        status("Image removed. This card will use the default look.", "ok");
      })
      .catch(function () {
        setBusy(false);
        status("Could not reach the server. Is the PHP/MySQL backend running?", "error");
      });
  }

  function init() {
    var root = document.getElementById("bannerWidget");
    if (!root) return;

    els = {
      root: root,
      file: document.getElementById("bannerFile"),
      preview: document.getElementById("bannerPreview"),
      chooseBtn: document.getElementById("bannerChooseBtn"),
      removeBtn: document.getElementById("bannerRemoveBtn"),
      status: document.getElementById("bannerStatus"),
      hidden: document.getElementById("bannerUrl")
    };

    if (els.file) {
      els.file.addEventListener("change", function () {
        if (els.file.files && els.file.files[0]) upload(els.file.files[0]);
      });
    }
    if (els.chooseBtn && els.file) {
      els.chooseBtn.addEventListener("click", function (e) {
        e.preventDefault();
        if (!busy) els.file.click();
      });
    }
    if (els.removeBtn) {
      els.removeBtn.addEventListener("click", function (e) {
        e.preventDefault();
        remove();
      });
    }

    // Drag and drop onto the preview box.
    if (els.preview) {
      ["dragenter", "dragover"].forEach(function (evt) {
        els.preview.addEventListener(evt, function (e) {
          e.preventDefault();
          els.preview.classList.add("bn-preview-drag");
        });
      });
      ["dragleave", "drop"].forEach(function (evt) {
        els.preview.addEventListener(evt, function (e) {
          e.preventDefault();
          els.preview.classList.remove("bn-preview-drag");
        });
      });
      els.preview.addEventListener("drop", function (e) {
        var dt = e.dataTransfer;
        if (dt && dt.files && dt.files[0]) upload(dt.files[0]);
      });
    }

    // On the create wizard, hackathon-create.js has already restored the hidden
    // field from localStorage by the time we get here (its script tag comes
    // first), so an image chosen before a page hop still shows up.
    if (els.hidden && els.hidden.value) paint(els.hidden.value);
  }

  document.addEventListener("DOMContentLoaded", init);

  return {
    // Called by hackathon-edit.js once it knows which hackathon it's editing.
    attachTo: function (id) { hackathonId = Number(id) || 0; },
    setBanner: function (url) { setValue(url || ""); },
    getBanner: function () { return els.hidden ? els.hidden.value : ""; }
  };
})();
