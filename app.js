// ======================================================
// 1. 기본 설정 및 상수
// ======================================================
const REPO_USER = "jaydo14"; 
const REPO_NAME = "english-app";
const BASE_URL = `https://raw.githubusercontent.com/${REPO_USER}/${REPO_NAME}/main/contents/`;

// 🚨 [필수] 배포한 구글 스크립트(웹 앱) 주소를 따옴표 안에 넣어주세요!
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxjrkSJiUr2Vt7AglXAVoAYo6UXaP0guBMj2krTu5bD2HsdxhYWMJRA8rhyt47ZDFl1/exec"; 

// 학습 반복 횟수 설정 (18회)
const totalCycles = 18;

// 유닛별 제목 설정 (선생님이 요청하신 목록)
const unitTitles = {
  1: "Music",
  2: "Directions",
  3: "Favorite beverage and snack",
  4: "Where you like to watch movies",
  5: "Lunch",
  6: "Vacation",
  7: "New years",
  8: "Switch lives"
};

// ----------------------
// 2. 변수 및 요소 가져오기
// ----------------------
const loginBox = document.getElementById("login-box");
const app = document.getElementById("app");
const studyBox = document.getElementById("study-box");
const unitButtonsContainer = document.getElementById("unit-buttons"); // 버튼들이 들어갈 곳
const sentenceText = document.getElementById("sentence");
const sentenceKor = document.getElementById("sentence-kor");
const progressBar = document.getElementById("progress");
const progressPercent = document.getElementById("progress-percent");
const phoneInput = document.getElementById("phone-input");

let currentType = ""; // 교재 코드 (예: hc12u)
let currentUnit = 1;
let currentData = []; // 문장 데이터
let index = 0;
let cycle = 1;

const player = new Audio(); 

// ----------------------
// 3. 초기화 및 유닛 버튼 생성
// ----------------------
// 앱이 켜지면 유닛 버튼을 예쁘게 만듭니다.
function renderUnitButtons() {
  unitButtonsContainer.innerHTML = ""; // 기존 버튼 비우기
  
  for (let i = 1; i <= 8; i++) {
    const btn = document.createElement("button");
    // 버튼 내용: 윗줄엔 Unit 번호, 아랫줄엔 제목
    btn.innerHTML = `Unit ${i}<br><span class="unit-title">${unitTitles[i]}</span>`;
    btn.onclick = () => selectUnit(i);
    unitButtonsContainer.appendChild(btn);
  }
}

// ----------------------
// 4. 로그인 (구글 시트 연동)
// ----------------------
window.login = function () {
  const inputVal = phoneInput.value.trim();
  const loginBtn = document.querySelector("#login-box button");
  
  if (inputVal.length < 1) {
    alert("번호를 입력해주세요.");
    return;
  }

  loginBtn.disabled = true;
  loginBtn.innerText = "확인 중...";

  // 구글 스크립트에 접속해서 학생 정보 가져오기
  fetch(GOOGLE_SCRIPT_URL + "?phone=" + inputVal)
  .then(res => res.json())
  .then(data => {
    if (data.result === "success") {
      // 로그인 성공
      currentType = data.type; // 교재 코드 저장
      const studentName = data.name;

      alert(`반갑습니다, ${studentName}님!\n오늘도 화이팅하세요!`);
      
      // 유닛 버튼 생성 실행
      renderUnitButtons();
      document.getElementById("welcome-msg").innerText = "Unit 선택";
      
      loginBox.style.display = "none";
      app.style.display = "block";
    } else {
      // 로그인 실패
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
// 5. 유닛 선택 및 데이터 로드 (이어하기 기능 포함)
// ----------------------
window.selectUnit = async function (n) {
  currentUnit = n;
  const fileName = `${currentType}${currentUnit}.json`;
  const fullUrl = BASE_URL + fileName;

  // 화면 전환
  studyBox.style.display = "block";
  document.querySelector('.box:not(#study-box)').style.display = 'none';
  sentenceText.innerText = "Loading...";
  sentenceKor.innerText = "";

  // ⭐ 버튼 글씨 초기화 (Start로 되돌림)
  const startBtn = document.querySelector("#study-box button");
  if (startBtn) startBtn.innerText = "Start";

  try {
    const response = await fetch(fullUrl);
    if (!response.ok) throw new Error("파일 없음");

    currentData = await response.json();
    
    // === ⭐ 자동 이어하기 로직 ===
    const userPhone = phoneInput.value.trim();
    const saveKey = `save_${userPhone}_unit${currentUnit}`;
    const savedData = localStorage.getItem(saveKey);

    // 기본값
    index = 0;
    cycle = 1;

    // 저장된 기록이 있으면 묻지 않고 바로 적용
    if (savedData) {
      const parsed = JSON.parse(savedData);
      index = parsed.index;
      cycle = parsed.cycle;
    }
    // === 로직 끝 ===

    updateProgress();
    sentenceText.innerText = "Start 버튼을 눌러주세요";

  } catch (error) {
    alert(`[오류] 학습 자료(${fileName})를 찾을 수 없습니다.`);
    studyBox.style.display = "none";
    document.querySelector('.box:not(#study-box)').style.display = 'block';
  }
};

// ----------------------
// 6. 학습 시작 (버튼 클릭)
// ----------------------
window.startStudy = function () {
  // ⭐ 버튼 글씨 변경 (Listen again)
  const startBtn = document.querySelector("#study-box button");
  if (startBtn) {
    startBtn.innerText = "Listen again";
  }

  playSentence();
};

// ----------------------
// 7. 문장 재생 및 화면 표시
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
    alert("오디오 파일이 없습니다.");
  }

  player.onended = () => {
    sentenceText.style.color = "#ffff00"; // 노란색 (따라할 차례)
    recognizer.start();
  };
}

// ----------------------
// 8. 음성 인식 및 정답 체크
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
    // 정답
    sentenceText.innerText = "Great!";
    sentenceKor.innerText = ""; 
    sentenceText.classList.remove("fail");
    sentenceText.classList.add("success");
    sentenceText.style.color = "#39ff14"; 
    setTimeout(nextStep, 500); 
  } else {
    // 오답
    sentenceText.innerText = "Try again";
    sentenceKor.innerText = ""; 
    sentenceText.classList.remove("success");
    sentenceText.classList.add("fail");
    sentenceText.style.color = "#ff4b4b"; 
    setTimeout(() => { playSentence(); }, 500);
  }
}

// ----------------------
// 9. 다음 단계로 이동 (저장 기능 포함)
// ----------------------
function nextStep() {
  sentenceText.style.color = "#fff"; 
  index++; 

  // === ⭐ 현재 위치 자동 저장 (핸드폰에) ===
  const userPhone = phoneInput.value.trim();
  const saveKey = `save_${userPhone}_unit${currentUnit}`;
  const state = { index: index, cycle: cycle };
  localStorage.setItem(saveKey, JSON.stringify(state));
  // ======================================

  // 한 사이클 끝남?
  if (index >= currentData.length) {
    index = 0; 
    cycle++;   
    
    // 사이클 올라간 상태 저장
    state.index = 0;
    state.cycle = cycle;
    localStorage.setItem(saveKey, JSON.stringify(state));

    sendDataToGoogle(); // 구글 시트로 전송
  }

  // 전체 목표 달성?
  if (cycle > totalCycles) {
    alert("🎉 학습 완료! 수고하셨습니다.");
    // 다 했으니 저장된 기록 삭제
    localStorage.removeItem(saveKey);
    location.reload(); 
    return;
  }

  playSentence();
}

// 구글 시트 전송 함수
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

// 진행률 표시 (퍼센트만 표시)
function updateProgress() {
  const totalSentences = currentData.length;
  const currentCount = ((cycle - 1) * totalSentences) + (index + 1);
  const totalCount = totalCycles * totalSentences;
  
  let percent = (currentCount / totalCount) * 100;
  if (percent > 100) percent = 100;
  const rounded = Math.floor(percent);

  progressBar.style.width = rounded + "%";
  progressPercent.innerText = rounded + "%"; // 몇 번째 Cycle인지 숨김
}
