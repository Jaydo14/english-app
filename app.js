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

const loginBox = document.getElementById("login-box");
const app = document.getElementById("app");
const studyBox = document.getElementById("study-box");
const sentenceText = document.getElementById("sentence");
const progressBar = document.getElementById("progress");
const percentText = document.getElementById("percentText");

let currentUnit = 1;
let index = 0;
let cycle = 1;
const totalCycles = 5;

const player = new Audio();

// 로그인
window.login = function () {
  loginBox.style.display = "none";
  app.style.display = "block";
};

// Unit 선택
window.selectUnit = function (n) {
  currentUnit = n;
  index = 0;
  cycle = 1;
  app.style.display = "none";
  studyBox.style.display = "block";
  updateProgress();
};

// 진행률
function updateProgress() {
  const percent = ((cycle - 1) * 8 + (index + 1)) / (totalCycles * 8) * 100;
  progressBar.style.width = percent + "%";
  percentText.innerText = Math.floor(percent) + "%";
}

// 음성 인식
window.SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

const recognizer = new SpeechRecognition();
recognizer.lang = "en-US";
recognizer.interimResults = false;

// 저장
function saveProgress() {
  localStorage.setItem("progress_unit_" + currentUnit, JSON.stringify({
    index,
    cycle
  }));
}

function loadProgress() {
  const data = localStorage.getItem("progress_unit_" + currentUnit);
  if (!data) return;
  const saved = JSON.parse(data);
  index = saved.index;
  cycle = saved.cycle;
}

// Start 버튼
window.startStudy = function () {
  loadProgress();
  playSentence();
};

// 파형 비주얼라이저
const canvas = document.getElementById("visualizer");
const ctx = canvas.getContext("2d");

let audioContext;
let analyser;
let source;

function initVisualizer() {
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 256;
}

function connectAudio() {
  if (!audioContext) initVisualizer();

  source = audioContext.createMediaElementSource(player);
  source.connect(analyser);
  analyser.connect(audioContext.destination);

  visualize();
}

function visualize() {
  const WIDTH = canvas.width;
  const HEIGHT = canvas.height;

  requestAnimationFrame(visualize);

  let dataArray = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteTimeDomainData(dataArray);

  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.lineWidth = 2;
  ctx.strokeStyle = "#39ff14";

  ctx.beginPath();

  let sliceWidth = WIDTH / dataArray.length;
  let x = 0;

  for (let i = 0; i < dataArray.length; i++) {
    let v = dataArray[i] / 128.0;
    let y = (v * HEIGHT) / 2;

    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);

    x += sliceWidth;
  }

  ctx.lineTo(WIDTH, HEIGHT / 2);
  ctx.stroke();
}

// 문장 재생
function playSentence() {

  sentenceText.className = "";

  sentenceText.innerText = units[currentUnit][index];

  player.src = audioList[index];
  player.play();

  connectAudio();

  player.onended = () => {
    recognizer.start();
  };
}

// 인식 결과 처리
recognizer.onresult = (event) => {
  const text = event.results[0][0].transcript;

  sentenceText.className = "success";

  nextStep();
};

// 인식 실패
recognizer.onerror = () => {
  sentenceText.className = "fail";
};

// 다음 단계
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
  saveProgress();
  playSentence();
}
