// Shared Save logic for the profile-building pages (about.html,
// education.html, contact.html). Loads the participant's saved
// profile from api/profile_get.php, and Save posts just this page's
// fields to api/profile_save.php.

function fillFieldsFromProfile(profile) {
  document.querySelectorAll(".pb-panel [name]").forEach((field) => {
    if (profile[field.name] !== undefined && profile[field.name] !== null) {
      field.value = profile[field.name];
    }
  });
}

function saveCurrentPage() {
  const feedback = document.getElementById("saveFeedback");
  const payload = {};

  document.querySelectorAll(".pb-panel [name]").forEach((field) => {
    payload[field.name] = field.value;
  });

  fetch("api/profile_save.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  })
    .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
    .then(({ ok, data }) => {
      if (!feedback) return;
      if (ok && data.success) {
        feedback.textContent = "Saved.";
      } else {
        feedback.textContent = (data && data.error) || "Could not save. Please try again.";
      }
      setTimeout(() => { feedback.textContent = ""; }, 2500);
    })
    .catch(() => {
      if (feedback) {
        feedback.textContent = "Could not reach the server.";
        setTimeout(() => { feedback.textContent = ""; }, 2500);
      }
    });
}

document.addEventListener("DOMContentLoaded", () => {
  // This wizard edits a logged-in participant's profile — bounce
  // anyone who isn't logged in back to the login page first.
  fetch("api/me.php")
    .then((res) => res.json())
    .then((data) => {
      if (!data.participant) {
        window.location.href = "login.html?next=" + encodeURIComponent(window.location.pathname.split("/").pop());
        return;
      }
      return fetch("api/profile_get.php").then((res) => res.json());
    })
    .then((data) => {
      if (data && data.success) {
        fillFieldsFromProfile(data.profile);
      }
    })
    .catch(() => {
      // If the backend is unreachable, leave the form blank rather than
      // silently failing the redirect check above.
    });

  const saveBtn = document.getElementById("saveBtn");
  if (saveBtn) {
    saveBtn.addEventListener("click", saveCurrentPage);
  }
});
