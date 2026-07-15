
window.KenteiRouter = (() => {
  const routes = [
    "home", "word", "quiz", "calculation", "calcQuiz", "exam", "calcExamSetup", "calcExam", "calcExamResult", "comprehensiveExamSetup", "comprehensiveExam", "comprehensiveExamResult", "examMaintenance",
    "wordList", "history", "ranking", "examDate", "settings", "wordExamSetup", "wordExam", "wordExamResult"
  ];

  function show(route) {
    const safeRoute = routes.includes(route) ? route : "home";

    document.querySelectorAll(".page").forEach((page) => {
      page.classList.add("hidden");
    });

    const target = document.getElementById(`page-${safeRoute}`);
    if (target) {
      target.classList.remove("hidden");
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
    window.history.replaceState({}, "", `#${safeRoute}`);
    document.dispatchEvent(new CustomEvent("kentei:route", { detail: safeRoute }));
  }

  function current() {
    return window.location.hash.replace("#", "") || "home";
  }

  return { show, current };
})();
