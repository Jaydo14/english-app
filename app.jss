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
const sentenceText = document.getElementById("sentence");
const recognizedText = document.getElementById("recognized");

let currentUnit = 1;
let index = 0;
let cycle = 1;
const totalCycles = 5;

const player = new Audio();
player.crossOrigin = "anonymous";

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
};

// ----------------------
// 음성 인식
// ----------------------
window.SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

const recognizer = new SpeechRecognition();
recognizer.lang = "en-US";
recognizer.interimResults = true;   // 🔥 실시간 인식 활성화

// ----------------------
// Start 버튼
// ----------------------
window.startStudy = function () {
  playSentence();
};

// ----------------------
// 원어민 음성 재생
// ----------------------
function playSentence() {

  const text = units[currentUnit][index];
  sentenceText.innerText = text;
  recognizedText.innerHTML = "";

  player.src = audioList[index];
  player.play();

  player.onended = () => {
    recognizer.start();
  };
}

// ----------------------
// 단어 일치율 계산 함수
// ----------------------
function similarityPercent(target, spoken) {

  target = target.toLowerCase();
  spoken = spoken.toLowerCase();

  const targetWords = target.split(" ");
  const spokenWords = spoken.split(" ");

  let match = 0;

  targetWords.forEach((w, i) => {
    if (spokenWords[i] && spokenWords[i] === w) match++;
  });

  return (match / targetWords.length) * 100;
}

// ----------------------
// 실시간 하이라이트 표시
// ----------------------
recognizer.onresult = (event) => {

  const spoken = event.results[0][0].transcript;
  const target = units[currentUnit][index];

  const percent = similarityPercent(target, spoken);

  // 🔥 하이라이트 처리
  const spokenLength = spoken.length;

  recognizedText.innerHTML =
    `<span style="color:#00ff6a;">${target.slice(0, spokenLength)}</span>` +
    `<span style="color:white;">${target.slice(spokenLength)}</span>` +
    `<br><span style="color:#00ff6a;">(${percent.toFixed(0)}%)</span>`;

  // 50% 이상 → 자동 다음 문장
  if (percent >= 50) {
    recognizer.stop();
    nextStep();
  }
};

// ----------------------
// 다음 단계
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

  playSentence();
}
