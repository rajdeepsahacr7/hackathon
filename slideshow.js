let slideIndex = 0;
showSlides();

function showSlides() {
  let i;
  let slides = document.getElementsByClassName("mySlides");
  for (i = 0; i < slides.length; i++) {
    slides[i].style.display = "none";
  }
  slideIndex++;
  if (slideIndex > slides.length) {slideIndex = 1}
  slides[slideIndex-1].style.display = "block";
  setTimeout(showSlides, 2000); // Change image every 2 seconds
}


document.addEventListener("DOMContentLoaded", () => {
  const statNumbers = document.querySelectorAll(".stat-number");
  const statsBar = document.querySelector(".stats-bar");

  function animateCount(el) {
    const target = parseInt(el.getAttribute("data-count"), 10);
    const prefix = el.getAttribute("data-prefix") || "";
    const suffix = el.getAttribute("data-suffix") || "";
    const duration = 1500; // ms
    const frameRate = 30;
    const totalFrames = Math.round(duration / (1000 / frameRate));
    let frame = 0;

    const counter = setInterval(() => {
      frame++;
      const progress = frame / totalFrames;
      const currentValue = Math.round(target * progress);
      el.textContent = prefix + currentValue + suffix;

      if (frame === totalFrames) {
        clearInterval(counter);
        el.textContent = prefix + target + suffix; // lock exact final value
      }
    }, 1000 / frameRate);
  }

  // Count up once the stats bar actually scrolls into view, rather than
  // finishing before the visitor ever sees it.
  if (statsBar && "IntersectionObserver" in window) {
    const statsObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            statNumbers.forEach(animateCount);
            statsObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.4 }
    );
    statsObserver.observe(statsBar);
  } else {
    statNumbers.forEach(animateCount);
  }
});

const squadGrid = document.getElementById("squadGrid");
let squadAutoSlideTimer;

function slideSquad(direction) {
  const card = squadGrid.querySelector(".squad-card");
  if (!card) return;

  const gap = 25;
  const scrollAmount = card.offsetWidth + gap;
  const maxScroll = squadGrid.scrollWidth - squadGrid.clientWidth;

  if (direction > 0 && squadGrid.scrollLeft >= maxScroll - 5) {
    // At the end, moving forward — loop back to the start
    squadGrid.scrollTo({ left: 0, behavior: "smooth" });
  } else if (direction < 0 && squadGrid.scrollLeft <= 5) {
    // At the start, moving backward — loop to the end
    squadGrid.scrollTo({ left: maxScroll, behavior: "smooth" });
  } else {
    squadGrid.scrollBy({ left: direction * scrollAmount, behavior: "smooth" });
  }

  resetSquadAutoSlide();
}

function startSquadAutoSlide() {
  squadAutoSlideTimer = setInterval(() => {
    slideSquad(1);
  }, 4000); // advances every 4 seconds — adjust to taste
}

function stopSquadAutoSlide() {
  clearInterval(squadAutoSlideTimer);
}

function resetSquadAutoSlide() {
  stopSquadAutoSlide();
  startSquadAutoSlide();
}

document.addEventListener("DOMContentLoaded", () => {
  if (squadGrid) {
    startSquadAutoSlide();
    squadGrid.addEventListener("mouseenter", stopSquadAutoSlide);
    squadGrid.addEventListener("mouseleave", startSquadAutoSlide);
  }
});


document.addEventListener("DOMContentLoaded", () => {
  const cards = document.querySelectorAll(".track-card");
  const maxTilt = 9; // degrees — keep modest for an elegant feel, not a gimmick

  cards.forEach((card) => {
    card.addEventListener("mouseenter", () => {
      card.style.transition = "transform 0.1s ease-out";
    });

    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const percentX = x / rect.width - 0.5;   // -0.5 (left edge) to 0.5 (right edge)
      const percentY = y / rect.height - 0.5;  // -0.5 (top edge) to 0.5 (bottom edge)

      const rotateY = percentX * maxTilt * 2;
      const rotateX = percentY * -maxTilt * 2;

      card.style.transform =
        `perspective(1200px) scale(1.06) translateY(-10px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });

    card.addEventListener("mouseleave", () => {
      card.style.transition = "transform 0.5s ease";
      card.style.transform =
        "perspective(1200px) scale(1) translateY(0) rotateX(0deg) rotateY(0deg)";
    });
  });
});