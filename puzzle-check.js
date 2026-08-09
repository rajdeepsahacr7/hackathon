// Shared answer-checking logic for all three case pages.
// Reads the correct answer and the next page's URL from data attributes
// on #puzzleForm, so the same script works unmodified on every page.

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("puzzleForm");
  const input = document.getElementById("answerInput");
  const submitBtn = document.getElementById("submitAnswer");
  const feedback = document.getElementById("puzzleFeedback");

  const correctAnswer = form.dataset.answer.trim().toUpperCase();
  const nextPage = form.dataset.next;

  function checkAnswer() {
    const value = input.value.trim().toUpperCase();

    if (value === "") {
      feedback.textContent = "Enter your deduction first.";
      feedback.className = "puzzle-feedback incorrect";
      return;
    }

    if (value === correctAnswer) {
      feedback.textContent = "Correct. The game is afoot...";
      feedback.className = "puzzle-feedback correct";
      submitBtn.disabled = true;
      input.disabled = true;

      setTimeout(() => {
        window.location.href = nextPage;
      }, 1200);
    } else {
      feedback.textContent = "Incorrect deduction. Examine the evidence again.";
      feedback.className = "puzzle-feedback incorrect";
    }
  }

  submitBtn.addEventListener("click", checkAnswer);
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") checkAnswer();
  });
});
