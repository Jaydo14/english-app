// ---------- UNIT 문장 데이터 ----------
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

// ---------- MP3 파일 리스트 (GitHub raw 주소) ----------
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

let recognition;

// ---------- 로그인 ----------
document.getElementById("loginBtn").onclick = () => {
  document.getElementById("loginSection").style.display = "none";
  document.getElementById("unitSection").style.display = "block";
};

// ---------- 유닛 선택 ----------
document.querySelectorAll(".unitBtn").forEach(btn => {
  btn.addEventListener("click", () => {
    currentUnit = btn.dataset.unit;
    index = 0;
    document.getElementById("unitTitle").innerText = `Unit ${currentUnit}`;
    document.getElementById("unitSection").style.display = "none";
    document.getElementById("studySection").style.display = "block";
    showSentence();
  });
});

// ---------- 문장 표시 ----------
function showSentence() {
  const sentence = units[currentUnit][index];
  document.getElementById("sentenceText").innerText = sentence;

  const percent = Math.round(((index) / units[currentUnit].length) * 100);
  document.getElementById("progress").style.width = percent + "%";
  document.getElementById("progressPercent").innerText = percent + "% 완료";
}

// ---------- 오디오 + 음성인식 ----------
document.getElementById("startBtn").onclick = () => {
  playAudioThenRecognize();
};

function playAudioThenRecognize() {

  // 현재 문장 표시
  const sentence = units[currentUnit][index];
  document.getElementById("sentenceText").innerText = sentence;

  // 오디오 재생 (리스트에서 선택)
  const audio = new Audio(audioList[index]);
  audio.play();

  audio.onended = () => startRecognition(sentence);
}

// ---------- STT ----------
function startRecognition(targetText) {
  window.SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;

  recognition.start();

  recognition.onresult = e => {
    const spoken = e.results[0][0].transcript.toLowerCase();
    const target = targetText.toLowerCase();

    // 간단 매칭 (앞부분만 비교)
    if (spoken.includes(target.slice(0, 5))) {
      index++;

      if (index >= units[currentUnit].length) {
        alert("Unit Completed!");
        index = 0;
      }

      showSentence();
      playAudioThenRecognize();

    } else {
      alert("Try again 🙂");
      playAudioThenRecognize();
    }
  };
}
