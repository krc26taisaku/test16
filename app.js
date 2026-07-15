
const EXAM_DATE_KEY = "kentei_v2_exam_date";

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");

  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    toast.classList.remove("show");
  }, 2200);
}

function renderExamDate() {
  const input = document.getElementById("examDateInput");
  const status = document.getElementById("examDateStatus");
  const storedDate = localStorage.getItem(EXAM_DATE_KEY) || "";

  input.value = storedDate;

  if (!storedDate) {
    status.textContent = "試験日はまだ登録されていません。";
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const examDate = new Date(`${storedDate}T00:00:00`);
  const remaining = Math.ceil((examDate - today) / 86400000);

  status.textContent = remaining >= 0
    ? `登録中：${storedDate}（試験まであと${remaining}日）`
    : `登録中：${storedDate}（試験日は終了しています）`;
}


function renderExamCountdown() {
  const card = document.getElementById("examCountdownCard");
  if (!card) return;
  const storedDate = localStorage.getItem(EXAM_DATE_KEY) || "";
  if (!storedDate) {
    card.classList.add("hidden");
    return;
  }
  const today = new Date();
  today.setHours(0,0,0,0);
  const examDate = new Date(`${storedDate}T00:00:00`);
  const remaining = Math.ceil((examDate - today) / 86400000);
  card.classList.remove("hidden");
  document.getElementById("examCountdownDays").textContent = remaining >= 0 ? `あと${remaining}日` : "試験日は終了";
  document.getElementById("examCountdownDate").textContent = storedDate;
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-route]").forEach((button) => {
    button.addEventListener("click", () => {
      KenteiRouter.show(button.dataset.route);
      KenteiDrawer.close();
    });
  });

  document.querySelectorAll(".open-drawer").forEach((button) => {
    button.addEventListener("click", KenteiDrawer.open);
  });

  document.getElementById("closeDrawerButton").addEventListener("click", KenteiDrawer.close);
  document.getElementById("drawerBackdrop").addEventListener("click", KenteiDrawer.close);

  document.querySelectorAll("[data-placeholder]").forEach((button) => {
    button.addEventListener("click", () => {
      showToast(`${button.dataset.placeholder}は次の段階で追加します`);
    });
  });

  document.getElementById("saveExamDateButton").addEventListener("click", () => {
    const value = document.getElementById("examDateInput").value;

    if (!value) {
      showToast("試験日を選んでください");
      return;
    }

    localStorage.setItem(EXAM_DATE_KEY, value);
    renderExamDate();
    renderExamCountdown();
    if(window.KenteiHome)KenteiHome.render();
    showToast("試験日を保存しました");
  });

  document.getElementById("deleteExamDateButton").addEventListener("click", () => {
    localStorage.removeItem(EXAM_DATE_KEY);
    renderExamDate();
    renderExamCountdown();
    if(window.KenteiHome)KenteiHome.render();
    showToast("試験日を削除しました");
  });

  document.addEventListener("kentei:route", (event) => {
    if (event.detail === "examDate") renderExamDate();
    if (event.detail === "word") { KenteiWord.refreshHome(); renderExamCountdown(); }
  });


  KenteiWord.init();
  KenteiQuiz.init();
  KenteiWordList.init();
  KenteiHistory.init();
  KenteiRanking.init();
  KenteiHome.init();
  KenteiSettings.init();
  KenteiExam.init();
  KenteiCalculation.init();
  KenteiCalcExam.init();
  KenteiComprehensiveExam.init();
  KenteiEngineStatus.init();
  renderExamCountdown();
  KenteiSettings.apply();
  document.getElementById("startAllButton").addEventListener("click",()=>KenteiQuiz.start("all"));
  document.querySelectorAll("[data-start-category]").forEach(b=>b.addEventListener("click",()=>KenteiQuiz.start(b.dataset.startCategory)));
  document.getElementById("startWrongButton").addEventListener("click",()=>KenteiQuiz.start("wrong"));
  document.getElementById("startFavoriteButton").addEventListener("click",()=>KenteiQuiz.start("favorite"));
  document.getElementById("resumeButton").addEventListener("click",KenteiQuiz.resume);
  document.getElementById("restartButton").addEventListener("click",()=>{if(confirm("前回のモードを最初から始めますか？"))KenteiQuiz.restartLast()});

  KenteiRouter.show(KenteiRouter.current());
});
