// ----------------------
// UNIT 문장 데이터
// ----------------------
const units = {
  1: [
    "What's your favorite food?",
    "My favorite food is Korean food.",
    "I like all kinds of Korean food.",
    "What's your favorite among them?",
    "I really enjoy different kinds of stews and soups.",
    "If I have to pick one, I would pick seaweed soup.",
    "But I'm not very picky about food.",
    "So I enjoy all types of cuisine."
  ]
};

// ----------------------
// MP3 파일 리스트 (GitHub raw 경로)
// ----------------------
const audioList = [
  "https://raw.githubusercontent.com/jaydo14/english-app/main/1_en.mp3",
  "https://raw.githubusercontent.com/jaydo14/english-app/main/2_en.mp3",
  "https://raw.githubusercontent.com/jaydo14/english-app/main/3_en.mp3",
  "https://raw.githubusercontent.com/jaydo14/english-app/main/4_en.mp3",
  "https://raw.githubusercontent.com/jaydo14/english-app/main/5_en.mp3",
  "https://raw.githubusercontent.com/jaydo14/english-app/main/6_en.mp3",
  "https://raw.githubusercontent.com/jaydo14/english-app/main/7_en.mp3",
  "https://raw.githubusercontent.com/jaydo14/english-app/main/8_en.mp3"
];

// ----------------------
// 화면 요소
// ----------------------
const loginBox = document.getElementById("login-box");
const app = document.getElementById("app");
const unitButtons = document.getElementById("unit-buttons");
const studyBox = document.getElementById("study-box");
const sentenceText = document.getElementById("sentence");
const progressBar = document.getElementById("progress");

let currentUnit = 1;
let index = 0;
let cycle = 1;
const totalCycles = 5;

const player = new Audio();

// ----------------------
// 로그인
// ----------------------
window.login = function () {
  loginBox.style.display = "none";
  app.style.display = "block";
};

// ----------------------
// UNIT 선택
// ----------------------
window.selectUnit = function (n) {
  currentUnit = n;
  index = 0;
  cycle = 1;
  studyBox.style.display = "block";
  updateProgress();
  sentenceText.innerText = units[currentUnit][index];
};

// ----------------------
// 진행률 업데이트
// ----------------------
function updateProgress() {
  const percent = ((cycle - 1) * 8 + (index + 1)) / (totalCycles * 8) * 100;
  progressBar.style.width = Math.floor(percent) + "%";
}

// ----------------------
// 음성 인식 설정
// ----------------------
window.SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

const recognizer = new SpeechRecognition();
recognizer.lang = "en-US";
recognizer.interimResults = false;

// ----------------------
// 학습 기록 저장
// ----------------------
function saveProgress() {
  localStorage.setItem("progress_unit_" + currentUnit, JSON.stringify({
    index,
    cycle
  }));
}

// ----------------------
// 학습 기록 불러오기
// ----------------------
function loadProgress() {
  const data = localStorage.getItem("progress_unit_" + currentUnit);
  if (!data) return;

  const saved = JSON.parse(data);
  index = saved.index;
  cycle = saved.cycle;
}

// ----------------------
// Start 버튼
// ----------------------
window.startStudy = function () {
  loadProgress();
  playSentence();
};

// ----------------------
// 문장 음성 재생
// ----------------------
function playSentence() {

  // 문장 표시
  sentenceText.innerText = units[currentUnit][index];

  // mp3 재생
  player.src = audioList[index];
  player.play();

  // 음성 끝난 뒤 자동 음성인식 시작
  player.onended = () => {
    recognizer.start();
  };
}

// ----------------------
// 음성 인식 처리
// ----------------------
recognizer.onresult = (event) => {
  const text = event.results[0][0].transcript;
  console.log("인식:", text);

  // 자동 다음 단계
  nextStep();
};

function nextStep() {

  index++;

  // 8문장 끝 → 다음 사이클
  if (index >= 8) {
    index = 0;
    cycle++;
  }

  // 학습 완료
  if (cycle > totalCycles) {
    alert("🎉 학습 완료!");
    return;
  }

  updateProgress();
  saveProgress();
  playSentence();
}
