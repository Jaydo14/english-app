// 공통: 모바일 터치 + 클릭 모두 인식
function bindClick(id, handler) {
  const el = document.getElementById(id);
  el.addEventListener("click", handler);
  el.addEventListener("touchstart", handler, { passive: true });
}

// 화면 요소
const loginScreen = document.getElementById("login-screen");
const unitScreen = document.getElementById("unit-screen");
const studyScreen = document.getElementById("study-screen");

const unitTitle = document.getElementById("unit-title");
const questionBox = document.getElementById("questionBox");
const progressText = document.getElementById("progress");

let currentUnit = 1;
let currentIndex = 0;
const totalQuestions = 10; // 원하는 총 문제 수

// 임시 문제 데이터
function makeQuestion(unit, idx) {
  return `Unit ${unit} - 문제 ${idx + 1}`;
}

// 진행률 업데이트
function updateProgress() {
  const percent = Math.round((currentIndex / totalQuestions) * 100);
  progressText.textContent = `진행률: ${percent}%`;
}

// 다음 문제 표시
function nextQuestion() {
  if (currentIndex >= totalQuestions) {
    questionBox.textContent = "학습 완료!";
    return;
  }
  questionBox.classList.remove("success", "fail");
  questionBox.textContent = makeQuestion(currentUnit, currentIndex);
  updateProgress();
}

// 시작 버튼
bindClick("startBtn", () => {
  loginScreen.classList.add("hidden");
  unitScreen.classList.remove("hidden");
});

// Unit 버튼 (터치 대응)
document.querySelectorAll(".unit-btn").forEach(btn => {
  btn.addEventListener("click", selectUnit);
  btn.addEventListener("touchstart", selectUnit, { passive: true });
});

function selectUnit(e) {
  currentUnit = e.target.dataset.unit;
  currentIndex = 0;

  unitTitle.textContent = `Unit ${currentUnit} 학습`;
  unitScreen.classList.add("hidden");
  studyScreen.classList.remove("hidden");

  nextQuestion();
}

// 정답 버튼
bindClick("correctBtn", () => {
  questionBox.classList.remove("fail");
  questionBox.classList.add("success");

  currentIndex++;
  setTimeout(nextQuestion, 500);
});

// 오답 버튼
bindClick("wrongBtn", () => {
  questionBox.classList.remove("success");
  questionBox.classList.add("fail");
});

// 뒤로가기
bindClick("backToUnit", () => {
  studyScreen.classList.add("hidden");
  unitScreen.classList.remove("hidden");
});
