// --- 간단 로그인 ---
function login() {
  const username = document.getElementById("username").value;
  if (!username) {
    alert("아이디를 입력하세요");
    return;
  }

  document.getElementById("loginSection").style.display = "none";
  document.getElementById("studySection").style.display = "block";
  currentSentenceIndex = 0;
  loadSentence();
}

// --- 학습 데이터 ---
const sentences = [
  { text: "How are you today?", audio: "audio/how_are_you_today.mp3" },
  { text: "I am happy to see you.", audio: "audio/i_am_happy_to_see_you.mp3" },
  { text: "This is an English speaking practice app.", audio: "audio/english_speaking_practice_app.mp3" }
];

let currentSentenceIndex = 0;
let recognition;
let recognizedSoFar = "";

// --- 문장 로드 ---
function loadSentence() {
  const s = sentences[currentSentenceIndex];
  document.getElementById("unitTitle").innerText = `Unit ${currentSentenceIndex + 1}`;
  recognizedSoFar = "";

  document.getElementById("recognizedText").innerText = "";
  document.getElementById("remainingText").innerText = s.text;
}

// --- 다음 문장 ---
function nextSentence() {
  currentSentenceIndex++;
  if (currentSentenceIndex >= sentences.length) {
    alert("모든 학습을 완료했습니다!");
    currentSentenceIndex = 0;
  }
  loadSentence();
}

// --- 오디오 재생 ---
function playAudio() {
  const audio = new Audio(sentences[currentSentenceIndex].audio);
  audio.play();
}

// --- 음성 인식 시작 ---
function startRecognition() {
  window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = true;
  recognition.continuous = true;

  document.getElementById("status").innerText = "🎤 듣는 중...";

  recognition.onresult = (event) => {
    const transcript = event.results[event.results.length - 1][0].transcript.trim();

    const target = sentences[currentSentenceIndex].text;

    // 사용자 발화가 target과 일치하는 앞부분만 찾아 표시
    let matchLength = 0;
    for (let i = 0; i < transcript.length && i < target.length; i++) {
      if (transcript[i].toLowerCase() === target[i].toLowerCase()) {
        matchLength++;
      } else {
        break;
      }
    }

    recognizedSoFar = target.slice(0, matchLength);

    document.getElementById("recognizedText").innerText = recognizedSoFar;
    document.getElementById("remainingText").innerText = target.slice(matchLength);
  };

  recognition.onerror = () => {
    document.getElementById("status").innerText = "마이크 오류가 발생했습니다.";
  };

  recognition.start();
}
