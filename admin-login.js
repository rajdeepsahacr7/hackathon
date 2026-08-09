// Admin login — posts to api/admin_login.php and, on success, starts a
// server-side admin session and redirects into the admin area.

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("adminLoginForm");
  const errorText = document.getElementById("loginError");
  const submitBtn = form.querySelector(".al-submit-btn");

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    if (!username || !password) {
      errorText.textContent = "Please enter both a username and password.";
      return;
    }

    errorText.textContent = "";
    submitBtn.disabled = true;

    fetch("api/admin_login.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        submitBtn.disabled = false;
        if (!ok || !data.success) {
          errorText.textContent = (data && data.error) || "Invalid username or password.";
          return;
        }
        window.location.href = "organise_hackathon.html";
      })
      .catch(() => {
        submitBtn.disabled = false;
        errorText.textContent = "Could not reach the server. Is the PHP/MySQL backend running?";
      });
  });
});
