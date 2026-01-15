// ======================================================
// 1. 기본 설정
// ======================================================
const REPO_USER = "jaydo14"; 
const REPO_NAME = "english-app";
const BASE_URL = `https://raw.githubusercontent.com/${REPO_USER}/${REPO_NAME}/main/contents/`;

// 🚨 구글 스크립트 주소 꼭 확인하세요!
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyt3TzvP1K_teKEbdX5jAD8B8h9nt2XbiwU7UMwCXNFW2H7EXUYJ8qSI2dKX6HJkqy1dg/exec"; 


// ----------------------
// 2. 변수 및 요소 설정
// ----------------------
const loginBox = document.getElementById("login-box");
const app = document.getElementById("app");
const studyBox = document.getElementById("study-box");
const sentenceText = document.getElementById("sentence");
const sentenceKor = document.getElementById("sentence-kor");
const progressBar = document.getElementById("progress");
const progressPercent = document.getElementById("progress-percent");
const phoneInput = document.getElementById("phone-input");

let currentType = ""; 
let currentUnit = 1;
let currentData = []; 
let index = 0;
let cycle = 1;

// ⭐ [수정됨] 총 18번 반복으로 변경
const totalCycles = 18; 

const player = new Audio(); 

// ----------------------
// 3. 기능 초기화 & 로그인 (자동 배정 기능)
// ----------------------
function bindClick(el, handler) {
  el.addEventListener("click", handler);
  el.addEventListener("touchstart", handler, { passive: true });
}

// ⭐ [수정됨] 로그인: 구글 시트에서 교재 정보 가져오기
window.login = function () {
  const inputVal = phoneInput.value.trim();
  const loginBtn = document.querySelector("#login-box button");
  
  if (inputVal.length < 1) {
    alert("번호를 입력해주세요.");
    return;
  }

  // 버튼 잠그기 (중복 클릭 방지)
  loginBtn.disabled = true;
  loginBtn.innerText = "정보 확인 중...";

  // 구글 스크립트에 물어보기 (GET 요청)
  fetch(GOOGLE_SCRIPT_URL + "?phone=" + inputVal)
  .then(res => res.json())
  .then(data => {
    if (data.result === "success") {
      // 1. 성공! 구글 시트에 적힌 교재코드(type)를 가져옴
      currentType = data.type; // 예: hc12u
      const studentName = data.name;

      alert(`반갑습니다, ${studentName}님!\n오늘도 화이팅하세요!`);
      
      // 교재 이름 표시 (옵션)
      document.getElementById("welcome-msg").innerText = "Unit 선택";
      
      loginBox.style.display = "none";
      app.style.display = "block";
    } else {
      // 실패
      alert("등록되지 않은 번호입니다. 선생님께 문의하세요.");
      loginBtn.disabled = false;
      loginBtn.innerText = "Login";
    }
  })
  .catch(error => {
    console.error(error);
    alert("접속 오류! 인터넷 연결을 확인하세요.");
    loginBtn.disabled = false;
    loginBtn.innerText = "Login";
  });
};

// ----------------------
// 4. GitHub에서 파일 불러오기
// ----------------------
window.selectUnit = async function (n) {
  currentUnit = n;
  
  // 파일명 조합: 구글시트에서 받은 코드 + 유닛번호 + .json
  const fileName = `${currentType}${currentUnit}.json`;
  const fullUrl = BASE_URL + fileName;

  studyBox.style.display = "block";
  document.querySelector('.box:not(#study-box)').style.display = 'none';
  sentenceText.innerText = "Loading...";
  sentenceKor.innerText = "";

  try {
    const response = await fetch(fullUrl);
    if (!response.ok) throw new Error("파일 없음");

    currentData = await response.json();
    
    // 학습 시작
    index = 0;
    cycle = 1;
    updateProgress();
    sentenceText.innerText = "Start 버튼을 누르세요";

  } catch (error) {
    alert(`[오류] 학습 자료(${fileName})를 찾을 수 없습니다.`);
    studyBox.style.display = "none";
    document.querySelector('.box:not(#study-box)').style.display = 'block';
  }
};

window.startStudy = function () {
  playSentence();
};

// ----------------------
// 5. 재생 및 화면 표시
// ----------------------
function playSentence() {
  sentenceText.classList.remove("success", "fail");
  sentenceText.style.color = "#fff"; 
  
  const item = currentData[index];
  sentenceText.innerText = item.en;
  sentenceKor.innerText = item.ko;
  
  updateProgress();

  if (item.audio) {
    player.src = BASE_URL + item.audio;
    player.play().catch(e => console.log("재생 오류", e));
  } else {
    alert("오디오 없음");
  }

  player.onended = () => {
    sentenceText.style.color = "#ffff00"; 
    recognizer.start();
  };
}

// ----------------------
// 6. 음성 인식
// ----------------------
window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognizer = new SpeechRecognition();
recognizer.lang = "en-US";
recognizer.interimResults = false;
recognizer.maxAlternatives = 1;

recognizer.onresult = (event) => {
  const spokenText = event.results[0][0].transcript;
  const targetText = currentData[index].en;
  checkAnswer(spokenText, targetText);
};

recognizer.onerror = (event) => {
  sentenceText.innerText = "Try again";
  sentenceKor.innerText = "";
  sentenceText.classList.add("fail");
  sentenceText.style.color = "#ff4b4b"; 
  setTimeout(() => { playSentence(); }, 500);
};

function checkAnswer(spoken, target) {
  const clean = (str) => str.toLowerCase().replace(/[.,?!'"]/g, "").trim();
  const userWords = clean(spoken).split(/\s+/); 
  const targetWords = clean(target).split(/\s+/);

  let matchCount = 0;
  targetWords.forEach(word => {
    if (userWords.includes(word)) matchCount++;
  });

  const accuracy = matchCount / targetWords.length;

  if (accuracy >= 0.5) {
    sentenceText.innerText = "Great!";
    sentenceKor.innerText = ""; 
    sentenceText.classList.remove("fail");
    sentenceText.classList.add("success");
    sentenceText.style.color = "#39ff14"; 
    setTimeout(nextStep, 500); 
  } else {
    sentenceText.innerText = "Try again";
    sentenceKor.innerText = ""; 
    sentenceText.classList.remove("success");
    sentenceText.classList.add("fail");
    sentenceText.style.color = "#ff4b4b"; 
    setTimeout(() => { playSentence(); }, 500);
  }
}

// ----------------------
// 7. 다음 단계 및 저장
// ----------------------
function nextStep() {
  sentenceText.style.color = "#fff"; 
  index++; 

  if (index >= currentData.length) {
    index = 0; 
    cycle++;   
    sendDataToGoogle(); 
  }

  if (cycle > totalCycles) {
    alert("🎉 오늘의 학습 목표 달성! 수고하셨습니다.");
    location.reload(); 
    return;
  }

  playSentence();
}

function sendDataToGoogle() {
  if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes("주소를")) return;
  const data = {
    action: "save",
    phone: phoneInput.value.trim(),
    unit: "Unit " + currentUnit,
    cycle: cycle - 1
  };
  fetch(GOOGLE_SCRIPT_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

// ⭐ [수정됨] 퍼센트만 표시하고 Cycle 정보는 숨기기
function updateProgress() {
  const totalSentences = currentData.length;
  const currentCount = ((cycle - 1) * totalSentences) + (index + 1);
  const totalCount = totalCycles * totalSentences;
  
  let percent = (currentCount / totalCount) * 100;
  if (percent > 100) percent = 100;
  const rounded = Math.floor(percent);

  progressBar.style.width = rounded + "%";
  // "Cycle 1/18" 글자 삭제하고 %만 표시
  progressPercent.innerText = rounded + "%";
}
