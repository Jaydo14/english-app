// -------------------------
// 로그인 처리
// -------------------------
function login() {
  document.getElementById("login-screen").style.display = "none";
  document.getElementById("unit-screen").style.display = "block";
}

// -------------------------
// Unit 선택 처리
// -------------------------
function selectUnit(unitNumber) {
  currentUnit = unitNumber;

  document.getElementById("unit-screen").style.display = "none";
  document.getElementById("study-screen").style.display = "block";

  document.getElementById("unit-title").innerText = "Unit " + unitNumber;
}

// -------------------------
// 학습 변수
// -------------------------
let currentSentenceIndex = 0;
let currentCycle = 1;
let totalCycles = 5;

let recognizing = false;

// GitHub mp3 주소 목록 (여기에 네 파일 주소 넣기)
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

const player = new Audio();

// -------------------------
// Start 버튼 누르면 시작
// -------------------------
function startStudy() {
  currentSentenceIndex = 0;
  currentCycle = 1;

  document.getElementById("start-btn").style.display = "none";

  playNativeAudio();
}

// -------------------------
// 원어민 음성 재생
// -------------------------
function playNativeAudio() {

  // 8문장 끝났으면 사이클 증가
  if (currentSentenceIndex >= audioList.length) {
    currentSentenceIndex = 0;
    currentCycle++;
  }

  // 5사이클 끝났으면 완료
  if (currentCycle > totalCycles) {
    alert("🎉 학습 완료!");
    return;
  }

  updateProgress();

  player.src = audioList[currentSentenceIndex];
  player.play();

  player.onended = () => {
    startSpeechRecognition();
  };
}

// -------------------------
// 음성 인식 시작
// -------------------------
function startSpeechRecognition() {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  const recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;

  recognition.start();

  recognition.onresult = (event) => {
    // 사용자가 말하면 다음 문장으로
    currentSentenceIndex++;
    playNativeAudio();
  };

  recognition.onerror = () => {
    // 에러가 나도 그냥 다음으로 진행
    currentSentenceIndex++;
    playNativeAudio();
  };
}

// -------------------------
// 진행률 표시 (%)
// -------------------------
function updateProgress() {
  const percent =
    ((currentCycle - 1) * 8 + currentSentenceIndex + 1) / (5 * 8) * 100;

  document.getElementById("progress").innerText =
    Math.floor(percent) + "%";
}
