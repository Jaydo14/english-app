/* -------------------------
   UNIT 문장 데이터
-------------------------- */
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

/* -------------------------
   MP3 파일 리스트 (GitHub Raw 주소)
-------------------------- */
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

let currentUnit = 1;
let index = 0;

let recognition = null;
const audioPlayer = new Audio();

/* -------------------------
   로그인
-------------------------- */
document.getElementById("loginBtn").addEventListener("click", () => {
  const name = document.getElementById("username").value.trim();

  if (!name) {
    alert("이름을 입력하세요!");
    return;
  }

  document.getElementById("unitSection").style.display = "block";
});

/* -------------------------
   UNIT 선택
-------------------------- */
function selectUnit(n) {
  currentUnit = n;
  index = 0;

  document.getElementById("studySection").style.display = "block";
  showSentence();
}

/* -------------------------
   문장 표시 + MP3 재생
-------------------------- */
function showSentence() {
  const sentence = units[currentUnit][index];

  document.getElementById("targetSentence").innerText = sentence;
  document.getElementById("recognizedText").innerHTML = "";
  document.getElementById("progressRate").innerHTML = "인식 진행률: 0%";

  audioPlayer.src = audioList[index];
  audioPlayer.play();

  audioPlayer.onended = () => {
    startRecognition();
  };
}

/* -------------------------
   다음 문장
-------------------------- */
function nextSentence() {
  index++;

  if (index >= units[currentUnit].length) {
    alert("Unit 학습 완료!");
    index = 0;
  }

  showSentence();
}

/* -------------------------
   음성인식 시작
-------------------------- */
function startRecognition() {
  recognition = new webkitSpeechRecognition();
  recognition.lang = "en-US";
  recognition.continuous = true;
  recognition.interimResults = true;

  const target = units[currentUnit][index].toLowerCase();

  recognition.onresult = (event) => {
    let spoken = "";

    for (let i = event.resultIndex; i < event.results.length; i++) {
      spoken += event.results[i][0].transcript;
    }

    spoken = spoken.toLowerCase().trim();

    visualizeRecognition(target, spoken);
  };

  recognition.onend = () => {
    // nothing
  };

  recognition.start();
}

/* -------------------------
   인식 진행률 + 글자색 변화
-------------------------- */
function visualizeRecognition(target, spoken) {
  let html = "";
  let match = 0;

  for (let i = 0; i < target.length; i++) {
    const t = target[i];
    const s = spoken[i];

    if (s === undefined) {
      html += `<span style="color:#666">${t}</span>`;
      continue;
    }

    if (t === s) {
      html += `<span style="color:#19ff6b;font-weight:bold">${t}</span>`;
      match++;
    } else {
      html += `<span style="color:#ff4d4d">${t}</span>`;
    }
  }

  const percent = Math.round((match / target.length) * 100);

  document.getElementById("recognizedText").innerHTML = html;
  document.getElementById("progressRate").innerHTML = `인식 진행률: ${percent}%`;

  // 50% 기준 넘어가면 자동 다음 문장
  if (percent >= 50) {
    document.getElementById("progressRate").style.color = "#19ff6b";
    nextSentence();
  } else {
    document.getElementById("progressRate").style.color = "#ff4d4d";
  }
}
