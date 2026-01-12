// ----------------------
// 1. UNIT 문장 데이터
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
// 2. MP3 파일 리스트 (Github 경로)
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
// 3. 화면 요소 가져오기
// ----------------------
const loginBox = document.getElementById("login-box");
const app = document.getElementById("app");
const unitButtons = document.getElementById("unit-buttons");
const studyBox = document.getElementById("study-box");
const sentenceText = document.getElementById("sentence");
const progressBar = document.getElementById("progress");
const progressPercent = document.getElementById("progress-percent");

// 상태 변수
let currentUnit = 1;
let index = 0;
let cycle = 1;
const totalCycles = 5; // 총 5회 반복 학습
const player = new Audio(); // 오디오 플레이어

// ----------------------
// 4. 초기 설정 및 로그인
// ----------------------
// 모바일 터치 지연 방지
function bindClick(el, handler) {
  el.addEventListener("click", handler);
  el.addEventListener("touchstart", handler, { passive: true });
}

// 로그인 함수
window.login = function () {
  loginBox.style.display = "none";
  app.style.display = "block";
};

// ----------------------
// 5. Unit 선택 및 학습 시작
// ----------------------
window.selectUnit = function (n) {
  currentUnit = n;
  index = 0;
  cycle = 1;

  // UI 전환
  studyBox.style.display = "block";
  document.querySelector('.box:not(#study-box)').style.display = 'none'; // Unit 선택창 숨기기

  updateProgress();
  sentenceText.innerText = "Start 버튼을 눌러주세요";
};

window.startStudy = function () {
  playSentence();
};

// ----------------------
// 6. 핵심: 오디오 재생 -> 음성인식
// ----------------------
function playSentence() {
  // 텍스트 표시 및 스타일 초기화
  sentenceText.classList.remove("success", "fail");
  sentenceText.innerText = units[currentUnit][index];
  
  // 진행률 업데이트
  updateProgress();

  // 오디오 소스 설정
  player.src = audioList[index];
  
  // 재생 시작
  player.play().catch(e => {
    console.log("자동 재생 막힘, 사용자 인터랙션 필요", e);
  });

  // 오디오가 끝나면 음성인식 시작
  player.onended = () => {
    sentenceText.style.color = "#ffff00"; // 듣기 모드일 때 노란색으로 표시 (시각적 힌트)
    recognizer.start();
  };
}

// ----------------------
// 7. 음성 인식 설정 (Web Speech API)
// ----------------------
window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

const recognizer = new SpeechRecognition();
recognizer.lang = "en-US";
recognizer.interimResults = false;
recognizer.maxAlternatives = 1;

// 음성 인식 결과 처리
recognizer.onresult = (event) => {
  const spokenText = event.results[0][0].transcript;
  const targetText = units[currentUnit][index];
  
  console.log("사용자 발음:", spokenText);
  console.log("목표 문장:", targetText);

  checkAnswer(spokenText, targetText);
};

// 음성 인식이 끊겼을 때 에러 방지
recognizer.onerror = (event) => {
  console.log("인식 에러:", event.error);
  sentenceText.innerText = "다시 말씀해 주세요.";
  setTimeout(() => {
     playSentence(); // 에러나면 다시 재생
  }, 1000);
};

// ----------------------
// 8. 정답 비교 로직 (업그레이드됨)
// ----------------------
function checkAnswer(spoken, target) {
  // 특수문자 제거 및 소문자 변환 함수
  const clean = (str) => str.toLowerCase().replace(/[.,?!'"]/g, "").trim();

  const userClean = clean(spoken);
  const targetClean = clean(target);

  // 정확히 일치하거나, 사용자가 말한 내용에 정답이 포함되어 있으면 성공
  if (userClean === targetClean || userClean.includes(targetClean)) {
    // 성공!
    sentenceText.classList.remove("fail");
    sentenceText.classList.add("success");
    sentenceText.innerText = "Great! " + target; // 피드백

    // 1.5초 뒤 다음 문장으로
    setTimeout(nextStep, 1500); 

  } else {
    // 실패
    sentenceText.classList.remove("success");
    sentenceText.classList.add("fail");
    sentenceText.innerText = "Try again: " + spoken; // 내가 뭐라고 했는지 보여줌

    // 1.5초 뒤 현재 문장 다시 듣기 (무한 반복)
    setTimeout(() => {
        playSentence(); 
    }, 1500);
  }
}

// ----------------------
// 9. 다음 단계 이동
// ----------------------
function nextStep() {
  sentenceText.style.color = "#fff"; // 색상 복구
  
  index++; // 다음 문장

  // Unit의 모든 문장을 다 들었을 때
  if (index >= units[currentUnit].length) {
    index = 0; // 첫 문장으로 리셋
    cycle++;   // 1회독 추가
  }

  // 목표 횟수(5회)를 다 채웠을 때
  if (cycle > totalCycles) {
    alert("🎉 학습 완료! 수고하셨습니다.");
    location.reload(); // 처음 화면으로
    return;
  }

  playSentence();
}

// ----------------------
// 10. 진행률 표시 UI
// ----------------------
function updateProgress() {
  const totalSentences = units[currentUnit].length;
  // 전체 진척도 계산: (현재바퀴수-1 * 문장수 + 현재문장번호) / (전체목표바퀴수 * 문장수)
  const currentCount = ((cycle - 1) * totalSentences) + (index + 1);
  const totalCount = totalCycles * totalSentences;
  
  let percent = (currentCount / totalCount) * 100;
  if (percent > 100) percent = 100;
  
  const rounded = Math.floor(percent);

  progressBar.style.width = rounded + "%";
  progressPercent.innerText = rounded + "% (Cycle " + cycle + "/" + totalCycles + ")";
}
