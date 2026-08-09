// Shared behavior for the admin edit pages (edit-hackathon.html,
// edit-client.html). Since there's no backend yet, Save Changes
// just confirms the action with inline feedback.

document.addEventListener("DOMContentLoaded", () => {
  const saveBtn = document.getElementById("saveChangesBtn");
  const feedback = document.getElementById("saveFeedback");

  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      if (feedback) {
        feedback.textContent = "Saved.";
        setTimeout(() => {
          feedback.textContent = "";
        }, 2500);
      }
    });
  }
});
