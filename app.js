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
// MP3 파일 리스트
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
const progressPercent = document.getElementById("progress-percent");

let currentUnit = 1;
let index = 0;
let cycle = 1;
const totalCycles = 5;

const player = new Audio();

// ----------------------
// 모바일 터치 + 클릭 둘 다 인식
// ----------------------
function bindClick(el, handler) {
  el.addEventListener("click", handler);
  el.addEventListener("touchstart", handler, { passive: true });
}

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
// 진행률 업데이트 (막대 + % 숫자)
// ----------------------
function updateProgress() {
  const percent =
    ((cycle - 1) * 8 + (index + 1)) / (totalCycles * 8) * 100;

  const rounded = Math.floor(percent);

  progressBar.style.width = rounded + "%";
  progressPercent.innerText = rounded + "%";
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
// Start 버튼
// ----------------------
window.startStudy = function () {
  playSentence();
};

// ----------------------
// 문장 음성 재생
// ----------------------
function playSentence() {
  sentenceText.classList.remove("success", "fail");

  sentenceText.innerText = units[currentUnit][index];

  player.src = audioList[index];
  player.play();

  player.onended = () => {
    recognizer.start();
  };
}

// ----------------------
// 🎙 음성 인식 결과 처리
// ----------------------
recognizer.onresult = (event) => {
  const text = event.results[0][0].transcript;
  console.log("인식:", text);

  // 매우 간단한 일치 판정
  const target = units[currentUnit][index].toLowerCase();
  const spoken = text.toLowerCase();

  if (spoken.includes(target.slice(0, 5))) {
    sentenceText.classList.remove("fail");
    sentenceText.classList.add("success");
  } else {
    sentenceText.classList.remove("success");
    sentenceText.classList.add("fail");
  }

  nextStep();
};

// ----------------------
// 다음 문장으로 이동
// ----------------------
function nextStep() {
  index++;

  if (index >= 8) {
    index = 0;
    cycle++;
  }

  if (cycle > totalCycles) {
    alert("🎉 학습 완료!");
    return;
  }

  updateProgress();
  playSentence();
}
