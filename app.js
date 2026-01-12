let sentences = [
  "What's your favorite food?",
  "My favorite food is Korean food.",
  "I like all kinds of Korean food.",
  "What's your favorite among them?",
  "I really enjoy different kinds of stews and soups.",
  "If I have to pick one, I would pick seaweed soup.",
  "But I'm not very picky about food.",
  "So I enjoy all types of cuisine."
];

let currentSentenceIndex = 0;
let currentCycle = 1;
let totalCycles = 5;

function login() {
  document.getElementById("login-screen").style.display = "none";
  document.getElementById("unit-screen").style.display = "block";
}

function selectUnit(unitNumber) {
  document.getElementById("unit-screen").style.display = "none";
  document.getElementById("study-screen").style.display = "block";
  document.getElementById("unit-title").innerText = "Unit " + unitNumber;
}

function startStudy() {
  document.getElementById("start-btn").style.display = "none";
  playSentence();
}

function playSentence() {
  let text = sentences[currentSentenceIndex];
  document.getElementById("current-sentence").innerText = text;

  let utter = new SpeechSynthesisUtterance(text);
  utter.onend = () => {
    startSpeechRecognition();
  };

  speechSynthesis.speak(utter);
}

function startSpeechRecognition() {
  let SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = new SpeechRecognition();
  recognition.lang = "en-US";

  recognition.onresult = (event) => {
    nextStep();
  };

  recognition.start();
}

function nextStep() {
  currentSentenceIndex++;

  if (currentSentenceIndex >= sentences.length) {
    currentSentenceIndex = 0;
    currentCycle++;
  }

  updateProgress();

  if (currentCycle > totalCycles) {
    alert("학습 완료 🎉");
    return;
  }

  playSentence();
}

function updateProgress() {
  document.getElementById("sentence-count").innerText =
    (currentSentenceIndex + 1) + "/8";

  document.getElementById("cycle-count").innerText =
    currentCycle + "/5";

  let percent =
    ((currentCycle - 1) * 8 + currentSentenceIndex + 1) /
    (5 * 8) * 100;

  document.getElementById("progress").innerText =
    Math.floor(percent) + "%";
}

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

let index = 0;
const player = new Audio();

function playNext() {
  if (index >= audioList.length) return;

  player.src = audioList[index];
  player.play();

  player.onended = () => {
    index++;
    playNext();
  };
}

<button onclick="playNext()">Start</button>
