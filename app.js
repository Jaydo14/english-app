// ======================================================
// 1. 기본 설정 및 상수
// ======================================================
const REPO_USER = "jaydo14"; 
const REPO_NAME = "english-app";
const BASE_URL = `https://raw.githubusercontent.com/${REPO_USER}/${REPO_NAME}/main/contents/`;
// ⭐ [필수] Apps Script '새 배포' URL을 여기에 넣어주세요!
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyBg0e4apmJOH1-CW1jnoc1je0aodVzFUZ-ea0RRtRahWFvTwSm0IjRC4Ntb0J97w0Y/exec"; 

let currentTotalCycles = 18; 
let currentPart = "Script"; 
let userName = ""; 
let currentType = ""; 
let currentUnit = 1;
let currentData = []; 
let index = 0;
let cycle = 1;
let isRepeating = false;

// 반복듣기 상태
let repeatIndex = 0; 
let repeatCycleCount = 0; 
// [추가] 반복 횟수 저장 변수 (기본값 3)
let repeatCountVal = 3;

const praiseList = ["Excellent!", "Great job!", "Amazing!", "Perfect!", "Fantastic!", "Superb!", "Unbelievable!"];

const player = new Audio();
let wakeLock = null;
let asTimer = null;
let asSeconds = 0;
let asData = null;
let isAlertShown = false; 
let isRestoring = false; 

let mediaRecorder; 
let audioChunks = []; 
let recordingTimer; 
let recSeconds = 0; 
let modalCallback = null; 

const successSound = new Audio(BASE_URL + "common/success.mp3");
const failSound = new Audio(BASE_URL + "common/fail.mp3");

const bookDatabase = {
  "hc12": { 1: "Music", 2: "Directions", 3: "Favorite beverage", 4: "Movies", 5: "Lunch", 6: "Vacation", 7: "New years", 8: "Switch lives" },
  "fc21": { 1: "Restaurant", 2: "Birthday", 3: "Expenses", 4: "Dream job", 5: "Movies", 6: "Eating healthy", 7: "Traveling alone", 8: "Education" }
};

// ======================================================
// 2. UI 및 유틸리티
// ======================================================
// [수정] 화면 전환 함수
// [수정 1] 화면 전환 함수 (HTML의 제어를 따르도록 연결)
function showBox(boxId) {
  // index.html에 있는 최신 화면 전환 로직을 빌려씁니다.
  if (typeof window.showBox === 'function' && window.showBox.length === 1) {
      // 재귀 호출 방지를 위해 내부 로직 확인 없이 HTML 스크립트가 덮어쓴 함수가 있다면 사용
      // (보통 index.html 하단의 스크립트가 이 함수를 덮어씁니다)
  }
  
  // 만약 HTML 스크립트가 아직 로드되지 않았거나 덮어쓰지 못했다면 비상용 로직 실행
  const boxes = ['login-box', 'unit-selector', 'menu-box', 'study-box', 'repeat-box', 'dev-box', 'as-box', 'results-box', 'as-record-box'];
  boxes.forEach(id => {
    const el = document.getElementById(id);
    if(el) el.style.display = (id === boxId) ? 'block' : 'none';
  });

  // 로그인 화면일 때는 앱 컨테이너 숨기기
  const app = document.getElementById("app");
  const loginBox = document.getElementById("login-box");
  const bottomNav = document.getElementById("bottom-nav");

  if (boxId === 'login-box') {
      if(app) app.style.display = 'none';
      if(loginBox) loginBox.style.display = 'flex';
      if(bottomNav) bottomNav.style.display = 'none';
  } else {
      if(app) app.style.display = 'flex';
      if(loginBox) loginBox.style.display = 'none';
      if(bottomNav) bottomNav.style.display = 'flex';
  }
}

// ======================================================
// [수정 1] 커스텀 모달 (버튼 숨김 옵션 추가)
// ======================================================
function showCustomModal(msg, callback = null, showButton = true) {
  player.pause(); 
  document.getElementById('modal-msg').innerText = msg;
  const modal = document.getElementById('custom-modal');
  modal.style.display = 'flex';
  
  // 모달 내부의 버튼을 찾아서 표시 여부 결정
  const btn = modal.querySelector('button'); 
  if(btn) btn.style.display = showButton ? 'block' : 'none';

  modalCallback = callback; 
}

function closeCustomModal() {
  const modal = document.getElementById('custom-modal');
  modal.style.display = 'none';
  // 닫을 때 버튼 다시 보이게 초기화
  const btn = modal.querySelector('button'); 
  if(btn) btn.style.display = 'block';

  if (modalCallback) { modalCallback(); modalCallback = null; }
}

// [추가/수정] UNIT 버튼 클릭 시 실행될 함수
window.goBackToUnits = function() {
    // 1. 재생 중인 오디오나 타이머가 있다면 정지
    stopRepeatAudio(); 
    if (typeof asTimer !== 'undefined' && asTimer) clearInterval(asTimer);
    
    // 2. 유닛 목록 화면('unit-selector')으로 이동
    showBox('unit-selector');
};

// [수정/추가] 모드 선택 화면으로 이동 (AS 모드 정리 기능 포함)
window.showMenu = function() {
    // 1. 재생 중인 오디오 정지
    if (typeof player !== 'undefined') player.pause();
    if (typeof stopRepeatAudio === 'function') stopRepeatAudio();

    // 2. AS 모드 타이머 및 녹음 정지 (오류 방지)
    if (typeof asTimer !== 'undefined' && asTimer) clearInterval(asTimer);
    if (typeof recordingTimer !== 'undefined' && recordingTimer) clearInterval(recordingTimer);
    
    // 녹음 중이었다면 녹음도 중지
    if (typeof mediaRecorder !== 'undefined' && mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
    }

    // 3. UI 정리 (녹음 UI 숨기고 듣기 버튼 다시 표시)
    const recUI = document.getElementById('recording-ui');
    const listenBtn = document.getElementById('as-listen-btn');
    const submitUI = document.getElementById('submit-ui');
    
    if(recUI) recUI.style.display = 'none';
    if(submitUI) submitUI.style.display = 'none';
    if(listenBtn) {
        listenBtn.style.display = 'flex';
        listenBtn.style.opacity = '1';
    }

    // 4. 모드 선택 화면('menu-box')으로 이동
    showBox('menu-box');
};

// [수정] 학습 상태 저장 (파트별 개별 저장 + 마지막 위치 기억)
function saveStatus() {
  // 기존 데이터 불러오기 (없으면 빈 깡통)
  let allStatus = JSON.parse(localStorage.getItem("myEnglishAppStatus_V2") || "{}");
  
  // 1. "history" 방이 없으면 만들기
  if (!allStatus.history) allStatus.history = {};
  
  // 2. 현재 유닛과 파트 이름으로 '고유 열쇠' 만들기 (예: "1_Script")
  const key = `${currentUnit}_${currentPart}`;
  
  // 3. 해당 칸에만 점수 기록 (다른 파트 건드리지 않음!)
  allStatus.history[key] = {
    index: index, cycle: cycle,
    repeatIndex: repeatIndex, repeatCycle: repeatCycleCount,
    timer: asSeconds
  };
  
  // 4. "마지막에 뭐 했는지"는 따로 적어두기 (로그인 시 납치용)
  allStatus.lastActive = { 
    type: currentType, unit: currentUnit, part: currentPart, name: userName 
  };
  
  // 저장!
  localStorage.setItem("myEnglishAppStatus_V2", JSON.stringify(allStatus));
}

// 학습 상태 불러오기
function loadStatus() {
  const saved = localStorage.getItem("myEnglishAppStatus");
  if (saved) return JSON.parse(saved);
  return null;
}

// 이어하기 체크 (모드 진입 시)
function checkResumeStatus(partName) {
    const allStatus = JSON.parse(localStorage.getItem("myEnglishAppStatus_V2") || "{}");
    
    // 내 열쇠 만들기 (예: "1_Script")
    const key = `${currentUnit}_${partName}`;
    
    // 기록 찾기
    const saved = allStatus.history ? allStatus.history[key] : null;
    
    // 기록이 있고, 교재 타입이 맞으면 복원
    if (saved && allStatus.lastActive && allStatus.lastActive.type === currentType) {
        index = saved.index || 0;
        cycle = saved.cycle || 1;
        repeatIndex = saved.repeatIndex || 0;
        repeatCycleCount = saved.repeatCycle || 0;
        asSeconds = saved.timer || 0;
        isRestoring = true; 
    } else {
        // 기록 없으면 초기화
        index = 0; cycle = 1; repeatIndex = 0; repeatCycleCount = 0; asSeconds = 0;
        isRestoring = false;
    }
}

// ======================================================
// 3. 로그인
// ======================================================
// [수정] 로그인 (자동 이동 기능 삭제 -> 무조건 목록 화면)
window.login = function () {
  const phoneInput = document.getElementById("phone-input");
  const inputVal = phoneInput.value.trim();
  if (inputVal.length < 1) return showCustomModal("번호를 입력해주세요.");
  
  const loginBtn = document.querySelector("#login-box button");
  loginBtn.disabled = true; loginBtn.innerText = "CHECKING...";

  fetch(GOOGLE_SCRIPT_URL + "?phone=" + inputVal)
    .then(res => res.json())
    .then(data => {
      if (data.result === "success") {
        currentType = data.type; userName = data.name;
        
        // 버튼 먼저 그리기
        renderUnitButtons();
        
        // [수정] 마지막 위치로 자동 이동하는 코드 삭제함!
        // 무조건 유닛 선택 화면 보여주기
        showBox('unit-selector');
        showCustomModal(`${userName}님, 🔥오늘도 화이팅 입니다!🔥`);
        
      } else {
        showCustomModal("등록되지 않은 번호입니다.");
        loginBtn.disabled = false; loginBtn.innerText = "Login";
      }
    }).catch(() => { showCustomModal("접속 오류"); loginBtn.disabled = false; });
};

// [수정] 유닛 버튼 렌더링 (교재별 아이콘 자동 변경 기능 추가)
function renderUnitButtons() {
  const container = document.getElementById("unit-buttons");
  container.innerHTML = ""; 
  const currentTitles = bookDatabase[currentType] || {};
  
  // 1. 교재별 아이콘 데이터베이스 정의
  const iconDatabase = {
    "hc12": [ // 첫 번째 교재 (Music, Directions...)
      "music_note",       // Unit 1
      "explore",          // Unit 2
      "local_cafe",       // Unit 3
      "movie",            // Unit 4
      "restaurant",       // Unit 5
      "flight_takeoff",   // Unit 6
      "celebration",      // Unit 7
      "switch_account"    // Unit 8
    ],
    "fc21": [ // 두 번째 교재 (Restaurant, Birthday...)
      "restaurant_menu",  // Unit 1: Restaurant
      "cake",             // Unit 2: Birthday
      "payments",         // Unit 3: Expenses
      "work",             // Unit 4: Dream job
      "theaters",         // Unit 5: Movies
      "eco",              // Unit 6: Eating healthy (건강/자연)
      "backpack",         // Unit 7: Traveling alone (배낭여행)
      "school"            // Unit 8: Education
    ]
  };

  // 2. 현재 교재에 맞는 아이콘 리스트 가져오기 (없으면 기본값 hc12)
  const currentIcons = iconDatabase[currentType] || iconDatabase["hc12"];

  for (let i = 1; i <= 8; i++) {
    const title = currentTitles[i] || "Locked";
    // 해당 유닛 번호에 맞는 아이콘 매칭
    const icon = currentIcons[i-1] || "lock"; 

    const btn = document.createElement("button");
    btn.className = "w-full bg-[#1c1c1c] rounded-2xl p-4 flex items-center justify-between mb-1 active:scale-[0.98] transition-transform border border-transparent hover:border-neutral-800";
    
    btn.innerHTML = `
      <div class="flex items-center gap-5">
        <div class="w-12 h-12 rounded-xl bg-[#1a2e1a] flex items-center justify-center text-[#39FF14]">
          <span class="material-icons-round text-2xl">${icon}</span>
        </div>
        <div class="text-left">
          <p class="text-[10px] font-mono font-bold text-[#39FF14] uppercase tracking-wider mb-1">UNIT ${String(i).padStart(2, '0')}</p>
          <h3 class="text-lg font-bold text-white leading-none">${title}</h3>
        </div>
      </div>
      <span class="material-icons-round text-neutral-600 text-3xl">chevron_right</span>
    `;
    
    btn.onclick = () => { currentUnit = i; showBox('menu-box'); };
    container.appendChild(btn);
  }
}

// ======================================================
// 4. 학습 엔진 (Script/Vocab - 버튼 대기 적용)
// ======================================================
window.startScriptMode = async function() { 
    currentPart = "Script"; 
    checkResumeStatus("Script"); 
    currentTotalCycles = 18; 
    loadStudyData(`${currentType}u${currentUnit}.json`); 
};

window.startVocaMode = async function() { 
    currentPart = "Vocab"; 
    checkResumeStatus("Vocab"); 
    currentTotalCycles = 10; 
    loadStudyData(`${currentType}u${currentUnit}_voca.json`); 
};

// [수정 2] loadStudyData 함수 (Start 버튼 고정 + 괄호 오류 방지)
async function loadStudyData(fileName) {
  isAlertShown = false; 
  try {
    const res = await fetch(BASE_URL + currentType + "u/" + fileName);
    currentData = await res.json();
    
    if (!isRestoring) {
        index = 0; cycle = 1;
    }
    
    // 버튼 설정 (항상 Start로 표시)
    const skipBtn = document.getElementById("skip-btn");
    const backBtn = document.getElementById("back-btn");
    const startBtn = document.getElementById("start-btn");

    if(startBtn) startBtn.innerText = "Start"; 
    
    // 버튼 레이아웃 제어
    if (isRestoring) {
        if(skipBtn) skipBtn.style.display = "block";
        if(backBtn) backBtn.classList.remove("col-span-2"); 
    } else {
        if(skipBtn) skipBtn.style.display = "none";
        if(backBtn) backBtn.classList.add("col-span-2"); 
    }
    
    updateProgress(); 
    showBox('study-box');
    
    // 텍스트 미리보기
    if (isRestoring) {
        const sText = document.getElementById("sentence");
        const item = currentData[index];
        sText.innerText = item.en; sText.style.color = "#fff";
        document.getElementById("sentence-kor").innerText = item.ko;
    }
  } catch (e) { 
      console.error(e);
      showCustomModal("파일 로드 실패"); 
  }
}

// [app.js 수정] startStudy 함수 내부
window.startStudy = function () { 
    document.getElementById("start-btn").innerText = "Listen again";
    
    // [수정] Skip 버튼이 나타나면서 Back 버튼과 나란히 배치됨
    const skipBtn = document.getElementById("skip-btn");
    const backBtn = document.getElementById("back-btn");
    
    skipBtn.style.display = "block";
    if(backBtn) backBtn.classList.remove("col-span-2"); // 반반 모드
    
    if (isRestoring) isRestoring = false;
    requestWakeLock();
    playSentence(); 
};

window.skipSentence = function() { try { recognizer.abort(); } catch(e) {} nextStep(); };

function playSentence() {
  const sText = document.getElementById("sentence");
  const item = currentData[index];
  sText.classList.remove("shake"); 
  sText.innerText = item.en; sText.style.color = "#fff";
  document.getElementById("sentence-kor").innerText = item.ko;
  updateProgress();
  player.src = BASE_URL + currentType + "u/" + item.audio;
  player.play();
  player.onended = () => { sText.style.color = "#ffff00"; try { recognizer.start(); } catch(e) {} };
}

window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognizer = new SpeechRecognition();
recognizer.lang = "en-US";
recognizer.onresult = (event) => {
  const spoken = event.results[0][0].transcript.toLowerCase();
  const target = currentData[index].en.toLowerCase().replace(/[.,?!'"]/g, "");
  const sText = document.getElementById("sentence");

  if (checkSimilarity(spoken, target) >= 0.5) {
    successSound.play(); 
    const praise = praiseList[Math.floor(Math.random() * praiseList.length)];
    sText.innerText = praise; sText.style.color = "#39ff14";
    setTimeout(nextStep, 700);
  } else {
    failSound.play(); 
    sText.innerText = "Try again"; sText.style.color = "#ff4b4b";
    sText.classList.remove("shake"); void sText.offsetWidth; sText.classList.add("shake");
    setTimeout(playSentence, 800);
  }
};

function checkSimilarity(spoken, target) {
  const sWords = spoken.split(' ');
  const tWords = target.split(' ');
  let cnt = 0;
  tWords.forEach(w => { if(spoken.includes(w)) cnt++; });
  return cnt / tWords.length;
}

function startRecognition() { try { recognizer.start(); } catch(e) {} }

window.nextStep = function() {
  index++; if (index >= currentData.length) { index = 0; cycle++; }
  const percent = Math.floor((((cycle - 1) * currentData.length) + index) / (currentTotalCycles * currentData.length) * 100);
  sendDataToGoogle(currentPart, percent + "%"); 
  if (percent >= 100 && !isAlertShown) { 
    isAlertShown = true; triggerFireworkConfetti(); 
    showCustomModal(`${currentPart} 100% 달성! 🎉`, () => playSentence()); return; 
  }
  playSentence();
};

// ======================================================
// 5. AS Correction (버튼 대기 적용 + 누적 저장)
// ======================================================
window.startASMode = async function() {
  currentPart = "AS Correction"; 
  checkResumeStatus("AS Correction");
  
  const phone = document.getElementById("phone-input").value.trim(); showBox('dev-box');
  try {
    const res = await fetch(`${GOOGLE_SCRIPT_URL}?action=getAS&phone=${phone}&unit=Unit ${currentUnit}`);
    asData = await res.json(); renderASPage(); showBox('as-box');
  } catch (e) { showCustomModal("첨삭 데이터 없음", () => showMenu()); }
};

// [수정 3] AS Correction 화면 (버튼 위치 복구)
function renderASPage() {
  const container = document.getElementById('as-box');
  container.className = "px-4 pt-2 flex flex-col text-left pb-10"; // h-full 제거
  
  const format = (t) => t ? String(t).replace(/\n/g, '<br>').replace(/\[(.*?)\]/g, '<span style="color:#ff4b4b; font-weight:bold;">$1</span>') : "";
  
  container.innerHTML = `
    <div class="mb-6">
        <h2 class="text-[#39FF14] text-lg font-bold mb-1">AS Correction</h2>
        <p class="text-[#39FF14] text-xs font-bold mb-1">[Question]</p>
        <p class="text-white text-xl font-bold leading-snug">${format(asData.question)}</p>
    </div>
    <div class="space-y-4 mb-6">
        <div class="bg-[#1c1c1c] rounded-xl p-4 w-full border border-neutral-800">
            <p class="text-neutral-500 text-xs font-bold mb-2">My Answer</p>
            <p class="text-neutral-300 text-sm leading-relaxed">${format(asData.original)}</p>
        </div>
        <div class="bg-[#1c1c1c] rounded-xl p-4 w-full border border-neutral-800">
            <p class="text-[#39FF14] text-xs font-bold mb-2">Feedback</p>
            <p class="text-white text-sm leading-relaxed">${format(asData.corrected)}</p>
        </div>
    </div>
    <div id="as-timer" class="text-[#39FF14] text-3xl font-black font-mono mb-4 tracking-tighter">
        ${Math.floor(asSeconds/60).toString().padStart(2,'0')}:${(asSeconds%60).toString().padStart(2,'0')}
    </div>
    <div class="mt-4 w-full flex gap-3 h-14">
        <button id="as-start-btn" onclick="startASStudy()" class="flex-1 bg-[#39FF14] text-black font-bold rounded-xl shadow-[0_0_15px_rgba(57,255,20,0.3)] active:scale-95 transition-transform hover:bg-[#32e012]">Start</button>
        <div id="as-controls" style="display:none;" class="flex-1 flex gap-2">
             <button onclick="playASAudio()" class="flex-1 bg-[#222] text-white font-bold rounded-xl border border-neutral-700 active:border-[#39FF14] transition-all text-sm">Listen</button>
             <button onclick="finishASStudy()" class="flex-1 bg-[#39FF14] text-black font-bold rounded-xl shadow-[0_0_10px_#39FF14] transition-all text-sm">Finish</button>
        </div>
        <button onclick="showMenu()" class="w-24 bg-[#1c1c1c] text-white font-bold rounded-xl border border-neutral-800 active:border-[#39FF14] active:text-[#39FF14] transition-all hover:bg-[#252525]">Back</button>
    </div>`;
    document.getElementById('as-start-btn').style.display = 'block';
    document.getElementById('as-controls').style.display = 'none';
}

window.startASStudy = function() {
  document.getElementById('as-start-btn').style.display = 'none'; document.getElementById('as-controls').style.display = 'flex';
  
  if (!isRestoring) { asSeconds = 0; }
  isRestoring = false;

  if (asTimer) clearInterval(asTimer);
  asTimer = setInterval(() => {
    asSeconds++;
    const m = Math.floor(asSeconds/60).toString().padStart(2,'0');
    const s = (asSeconds%60).toString().padStart(2,'0');
    const timerEl = document.getElementById('as-timer');
    if(timerEl) timerEl.innerText = `${m}:${s}`;
    saveStatus(); 
  }, 1000);
  playASAudio();
};
window.playASAudio = () => { player.src = BASE_URL + currentType + "u/" + asData.audio; player.play(); };
window.finishASStudy = function() {
  clearInterval(asTimer); const timeStr = Math.floor(asSeconds/60) + "분 " + (asSeconds%60) + "초";
  sendDataToGoogle("AS Correction", timeStr); // 저장 요청
  showCustomModal(`학습 완료! ✔`, () => showMenu());
};

// ======================================================
// 5. ACCURATE SPEAKING (화면 렌더링 추가로 검은 화면 해결)
// ======================================================

// ======================================================
// [수정 2] Accurate Speaking 시작 (로딩 시 버튼 숨김 적용)
// ======================================================
window.startAccurateSpeakingMode = async function() {
  const phoneInput = document.getElementById("phone-input");
  const phone = phoneInput ? phoneInput.value.trim() : "";
  
  if (!phone) return showCustomModal("로그인 정보가 없습니다.");

  // [핵심] 3번째 인자로 false를 넘겨서 OK 버튼을 숨김
  showCustomModal("데이터를 불러오는 중입니다...", null, false);

  try {
    const res = await fetch(`${GOOGLE_SCRIPT_URL}?action=getAS&phone=${phone}&unit=Unit ${currentUnit}`);
    asData = await res.json();
    
    closeCustomModal(); 
    renderAccurateSpeakingPage(); 
    showBox('as-record-box'); 

  } catch (e) { 
      console.error(e);
      showCustomModal("로드 실패\n(데이터를 가져오지 못했습니다)"); 
  }
};

// ======================================================
// [수정 3] 화면 렌더링 (질문 크기 축소, 박스 확대, 버튼 잘림 해결)
// ======================================================
// [수정] Accurate Speaking 화면 (중앙 정렬 + BACK TO MODE + 위치 수정)
function renderAccurateSpeakingPage() {
    const container = document.getElementById('as-record-box');
    
    // 1. 컨테이너 설정: 화면 꽉 채우기 + 중앙 정렬 준비
    // flex-col, h-full: 높이를 꽉 채움
    container.className = "fixed top-[80px] bottom-[90px] left-0 right-0 z-30 bg-black overflow-y-auto no-scrollbar px-6 flex flex-col";
    
    const isSubmitted = asData && asData.isSubmitted;
    const questionText = asData ? asData.question : "질문 데이터 없음";

    // ---------------------------------------------------------
    // Case 1: 이미 제출 완료된 상태 (중앙 정렬)
    // ---------------------------------------------------------
    if (isSubmitted) {
        container.innerHTML = `
            <div class="w-full h-full flex flex-col items-center justify-center space-y-8">
                
                <div class="text-center">
                    <h2 class="text-[#39FF14] text-lg font-bold mb-8">Accurate Speaking</h2>
                    <span class="material-icons-round text-[#39FF14] text-6xl mb-4">check_circle</span>
                    <p class="text-white text-xl font-bold">이미 제출 완료되었습니다.</p>
                    <p class="text-neutral-500 text-sm mt-2">첨삭 결과를 기다려주세요!</p>
                </div>

                <button onclick="showMenu()" class="w-full py-4 bg-[#1c1c1c] text-neutral-400 font-bold rounded-xl border border-neutral-800 active:border-white active:text-white transition-all text-sm uppercase tracking-wider">
                    BACK TO MODE
                </button>
            </div>
        `;
        return; 
    }

    // ---------------------------------------------------------
    // Case 2: 학습 진행 중 상태 (중앙 정렬 + 버튼 위치 조정)
    // ---------------------------------------------------------
    container.innerHTML = `
        <div class="w-full h-full flex flex-col items-center justify-center">
            
            <div class="w-full text-center mb-8">
                <h2 class="text-[#39FF14] text-lg font-bold mb-6">Accurate Speaking</h2>
                <p class="text-[#39FF14] text-xs font-bold mb-3 tracking-widest uppercase opacity-80">[ Question ]</p>
                <p id="as-q-text" class="text-white text-xl font-bold leading-relaxed break-keep drop-shadow-md">
                    ${questionText}
                </p>
            </div>

            <div class="w-full flex flex-col items-center mb-4">

                <button id="as-listen-btn" onclick="listenQuestion()" class="flex flex-col items-center justify-center w-40 h-40 rounded-full bg-[#1c1c1c] border-2 border-[#39FF14] shadow-[0_0_20px_rgba(57,255,20,0.2)] active:scale-95 transition-all hover:bg-[#252525]">
                    <span class="material-icons-round text-5xl text-[#39FF14] mb-2">headphones</span>
                    <span class="text-white text-sm font-bold tracking-wider">LISTEN</span>
                </button>

                <div id="recording-ui" style="display:none;" class="flex-col items-center w-full animate-fade-in-up">
                    <div class="w-40 h-40 rounded-full bg-[#1c1c1c] border-2 border-[#ff4757] flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(255,71,87,0.3)]">
                        <div id="rec-timer" class="text-[#ff4757] text-4xl font-black font-mono">00:00</div>
                    </div>
                    <button onclick="stopRecording()" class="w-full bg-[#ff4757] text-white font-black text-lg py-4 rounded-xl shadow-lg active:scale-95 transition-transform uppercase tracking-widest">
                        STOP RECORDING
                    </button>
                </div>

                <div id="submit-ui" style="display:none;" class="w-full animate-fade-in-up">
                    <div class="bg-[#1c1c1c] -mx-6 px-6 py-6 border-y border-neutral-800 mb-6">
                        <p class="text-neutral-500 text-xs font-bold mb-3">DICTATION</p>
                        <textarea id="student-text-input" rows="6" placeholder="녹음한 내용을 영어로 적어주세요..." 
                            class="w-full bg-transparent text-white text-lg font-medium focus:outline-none placeholder-neutral-600 resize-none leading-relaxed"></textarea>
                    </div>
                    
                    <button onclick="submitAccurateSpeaking()" class="w-full bg-[#39FF14] text-black font-black text-lg py-4 rounded-xl shadow-[0_0_20px_rgba(57,255,20,0.4)] active:scale-95 transition-transform hover:bg-[#32e012] uppercase tracking-widest">
                        SUBMIT ANSWER
                    </button>
                </div>

            </div>

            <button onclick="showMenu()" class="w-full py-4 bg-[#1c1c1c] text-neutral-400 font-bold rounded-xl border border-neutral-800 active:border-white active:text-white transition-all text-sm uppercase tracking-wider mt-4">
                BACK TO MODE
            </button>

        </div>
    `;
}

// [기능] 질문 듣기 -> 끝나면 녹음 시작
window.listenQuestion = function() {
  if (!asData || !asData.audio) return showCustomModal("오디오 정보가 없습니다.");
  
  const btn = document.getElementById('as-listen-btn');
  btn.style.opacity = "0.5"; // 재생 중 표시
  
  requestWakeLock();
  player.src = BASE_URL + currentType + "u/" + asData.audio;
  player.play().catch(() => showCustomModal("오디오 재생 실패"));
  
  player.onended = () => { 
      btn.style.opacity = "1";
      startRecording(); 
  }; 
};

// [기능] 녹음 시작
async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream); 
    audioChunks = [];
    
    // UI 전환
    document.getElementById('as-listen-btn').style.display = 'none';
    document.getElementById('recording-ui').style.display = 'flex';
    
    mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
    mediaRecorder.onstop = () => { processRecording(); };
    mediaRecorder.start();
    
    // 타이머 시작
    recSeconds = 0;
    if (recordingTimer) clearInterval(recordingTimer);
    recordingTimer = setInterval(() => { 
        recSeconds++; 
        document.getElementById('rec-timer').innerText = `00:${recSeconds.toString().padStart(2,'0')}`; 
        if (recSeconds >= 60) stopRecording(); // 최대 60초
    }, 1000);
    
  } catch (e) { 
      showCustomModal("마이크 권한이 필요합니다.\n설정에서 허용해주세요."); 
      document.getElementById('as-listen-btn').style.display = 'flex'; // 실패 시 원상복구
  }
}

// [기능] 녹음 중지
window.stopRecording = function() { 
    if (mediaRecorder && mediaRecorder.state !== "inactive") { 
        mediaRecorder.stop(); 
        clearInterval(recordingTimer); 
        
        // UI 전환
        document.getElementById('recording-ui').style.display = 'none'; 
        document.getElementById('submit-ui').style.display = 'block'; 
        
        // 입력창에 포커스
        setTimeout(() => document.getElementById('student-text-input').focus(), 100);
    } 
};

// [기능] 오디오 데이터 처리
async function processRecording() { 
    const blob = new Blob(audioChunks, { type: 'audio/webm' }); 
    const reader = new FileReader(); 
    reader.readAsDataURL(blob); 
    reader.onloadend = () => { window.lastAudioBase64 = reader.result.split(',')[1]; }; 
}

// [수정] 최종 제출 함수 (성공 시 모드 선택 화면으로 이동)
window.submitAccurateSpeaking = async function() {
    const textInput = document.getElementById('student-text-input');
    const text = textInput.value.trim();
    
    if(!text) return showCustomModal("받아적은 내용을 입력해주세요!");
    
    // 로딩 알림 (OK 버튼 없음)
    showCustomModal("제출 중입니다...", null, false); 
    
    const payload = { 
        action: "uploadAS", 
        phone: document.getElementById("phone-input").value.trim(), 
        unit: "Unit " + currentUnit, 
        studentText: text, 
        audioData: window.lastAudioBase64 
    };
    
    fetch(GOOGLE_SCRIPT_URL, { method: "POST", body: JSON.stringify(payload) })
      .then(res => res.json())
      .then(data => { 
          closeCustomModal(); // 로딩 닫기

          if(data.result === "success") {
              // [수정] 성공 시 'showMenu()'를 호출하여 '모드 선택 화면'으로 이동
              showCustomModal("제출 성공! ✔", () => showMenu());
          } else {
              showCustomModal("제출 실패\n다시 시도해주세요.");
          }
      })
      .catch(() => {
          closeCustomModal();
          showCustomModal("네트워크 오류 발생");
      });
};

// ======================================================
// 6. 반복듣기 (최종 수정: 버튼 위치 상향 + 횟수 조절 기능 복구)
// ======================================================

// [중요] 횟수 조절 함수 (이게 있어야 +, - 버튼이 작동합니다!)
window.adjustRepeatCount = function(diff) {
    repeatCountVal += diff;
    if(repeatCountVal < 1) repeatCountVal = 1; // 최소 1회
    if(repeatCountVal > 99) repeatCountVal = 99; // 최대 99회
    
    // 화면에 숫자 업데이트
    const display = document.getElementById('repeat-count-display');
    if(display) display.innerText = repeatCountVal;
};

// [수정] 반복듣기 모드 시작
window.startRepeatMode = async function() {
  currentPart = "반복듣기";
  try {
    const res = await fetch(`${BASE_URL}${currentType}u/${currentType}u${currentUnit}.json`);
    currentData = await res.json();
    checkResumeStatus("반복듣기"); 
    showBox('repeat-box');
    
    const container = document.getElementById('repeat-box');
    
    // 컨테이너 설정
    container.className = "px-4 pt-2 min-h-screen relative";

    container.innerHTML = `
      <div class="mb-4">
          <h2 class="text-[#39FF14] text-lg font-bold">Listen & Repeat</h2>
      </div>

      <div id="repeat-list" class="space-y-2 pb-[260px]">
         </div>

      <div class="fixed bottom-[100px] left-0 right-0 px-4 bg-gradient-to-t from-black via-black to-transparent pt-10 pb-2 z-50">
          
          <div class="flex items-center justify-center gap-4 bg-[#1c1c1c] rounded-xl p-2 border border-neutral-800 mb-2 shadow-2xl">
              <span class="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">REPEATS</span>
              <div class="flex items-center gap-2 bg-[#111] rounded-lg p-1 border border-neutral-800">
                  <button onclick="adjustRepeatCount(-1)" class="w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-white active:bg-neutral-800 rounded-md transition-colors">
                      <span class="material-icons-round text-sm">remove</span>
                  </button>
                  <span id="repeat-count-display" class="text-[#39FF14] font-bold font-mono text-lg w-6 text-center">${repeatCountVal}</span>
                  <button onclick="adjustRepeatCount(1)" class="w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-white active:bg-neutral-800 rounded-md transition-colors">
                      <span class="material-icons-round text-sm">add</span>
                  </button>
              </div>
              <span class="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">CYCLES</span>
          </div>

          <div class="grid grid-cols-2 gap-3 mb-2">
              <button id="repeat-start-btn" onclick="runRepeatAudio()" class="h-12 bg-[#39FF14] text-black font-black rounded-xl shadow-[0_0_15px_rgba(57,255,20,0.3)] active:scale-95 transition-transform flex items-center justify-center gap-2 hover:bg-[#32e012]">
                  <span class="material-icons-round">play_arrow</span> START
              </button>
              <button onclick="stopRepeatAudio()" class="h-12 bg-[#ff4757] text-white font-black rounded-xl shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2 hover:bg-[#ff6b81]">
                  <span class="material-icons-round">stop</span> STOP
              </button>
          </div>

          <button onclick="stopRepeatAudio(); showMenu();" class="w-full py-3 bg-[#1c1c1c] text-neutral-400 font-bold rounded-xl border border-neutral-800 active:border-white active:text-white transition-all text-sm uppercase tracking-wider shadow-lg">
              Back to Menu
          </button>
      </div>`;
    
    // 리스트 아이템 생성
    const list = document.getElementById('repeat-list');
    currentData.forEach((item, idx) => {
      const div = document.createElement('div'); 
      div.id = `repeat-${idx}`; 
      div.className = 'repeat-item py-1.5 px-3 rounded-xl border border-transparent transition-all duration-300';
      div.innerHTML = `
        <div class="en-text text-white text-base font-bold leading-snug mb-0.5 transition-colors">${item.en}</div>
        <div class="ko-text text-neutral-400 text-xs font-medium">${item.ko}</div>
      `;
      list.appendChild(div);
    });

  } catch (e) { console.error(e); showCustomModal("로드 실패"); }
};

// [수정] 반복 재생 실행 함수 (스타일 유지)
window.runRepeatAudio = async function() {
  const totalCycles = repeatCountVal;
  const btn = document.getElementById('repeat-start-btn');
  
  if (isRepeating) return; 
  isRepeating = true; 
  
  if(btn) {
      btn.disabled = true; 
      btn.innerHTML = `<div class="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>`;
  }

  if (isRestoring) isRestoring = false; 
  requestWakeLock();

  for (let c = repeatCycleCount; c < totalCycles; c++) {
    repeatCycleCount = c;
    let sIdx = (c === repeatCycleCount) ? repeatIndex : 0; 
    
    for (let i = sIdx; i < currentData.length; i++) {
      if (!isRepeating) { repeatIndex = i; saveStatus(); return; } 
      
      await new Promise(resolve => {
        document.querySelectorAll('.repeat-item').forEach(el => {
            el.className = 'repeat-item py-1.5 px-3 rounded-xl border border-transparent transition-all duration-300'; 
            el.querySelector('.en-text').className = 'en-text text-white text-base font-bold leading-snug mb-0.5 transition-colors';
            el.querySelector('.ko-text').className = 'ko-text text-neutral-400 text-xs font-medium';
        });
        
        const el = document.getElementById(`repeat-${i}`);
        if(el) { 
            el.className = 'repeat-item py-1.5 px-3 rounded-xl bg-[#1a3a1a] border border-[#39FF14]/30 shadow-[0_0_15px_rgba(57,255,20,0.1)] transition-all duration-300';
            const enDiv = el.querySelector('.en-text');
            if(enDiv) enDiv.className = 'en-text text-[#39FF14] text-base font-bold leading-snug mb-0.5 transition-colors';
            el.scrollIntoView({ behavior: 'smooth', block: 'center' }); 
        }

        player.src = `${BASE_URL}${currentType}u/${currentData[i].audio}`; 
        player.play();
        player.onended = resolve;
      });
      repeatIndex = i; saveStatus();
    }
    repeatIndex = 0; 
    sendDataToGoogle("반복듣기", `${c + 1}회 완료`); 
    
    if (c < totalCycles - 1 && isRepeating) { await new Promise(resolve => setTimeout(resolve, 1500)); }
  }
  
  stopRepeatAudio();
  repeatIndex = 0; repeatCycleCount = 0;
  saveStatus(); 
};

// [수정] 정지 함수
window.stopRepeatAudio = () => { 
  isRepeating = false; 
  player.pause(); 
  const btn = document.getElementById('repeat-start-btn');
  if(btn) { 
      btn.disabled = false; 
      btn.innerHTML = `<span class="material-icons-round">play_arrow</span> START`; 
  }
  saveStatus(); 
};

// ======================================================
// 7. 유틸리티 (Progress, 저장, Confetti)
// ======================================================
function updateProgress() {
  const currentCount = ((cycle - 1) * currentData.length) + index;
  const percent = Math.floor((currentCount / (currentTotalCycles * currentData.length)) * 100);
  document.getElementById("progress-percent").innerText = percent + "%";
  document.getElementById("progress").style.width = Math.min(percent, 100) + "%";
  saveStatus(); 
}

function sendDataToGoogle(part, val) {
  const phone = document.getElementById("phone-input").value.trim();
  fetch(GOOGLE_SCRIPT_URL, { method: "POST", mode: "no-cors", body: JSON.stringify({ action: "save", phone, unit: "Unit " + currentUnit, percent: val, part }) });
}

function triggerFireworkConfetti() {
  var duration = 4 * 1000; var animationEnd = Date.now() + duration;
  var interval = setInterval(function() {
    var timeLeft = animationEnd - Date.now();
    if (timeLeft <= 0) return clearInterval(interval);
    confetti({ particleCount: 50, startVelocity: 30, spread: 360, origin: { x: Math.random(), y: Math.random() - 0.2 } });
  }, 250);
}

// [추가] 화면 꺼짐 방지 (Wake Lock)
async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
    }
  } catch (err) {
    console.log("Wake Lock Error:", err);
  }
}

// [복구] 결과 리포트 페이지 보기
window.showResultsPage = async function() {
  const phone = document.getElementById("phone-input").value.trim(); 
  showBox('dev-box');
  try {
    const res = await fetch(`${GOOGLE_SCRIPT_URL}?action=getResults&phone=${phone}`);
    const data = await res.json(); 
    renderResultsCards(data); 
    showBox('results-box');
  } catch (e) { showCustomModal("데이터 로드 실패"); }
};

// [복구] 리포트 카드 디자인 렌더링
function renderResultsCards(data) {
  const container = document.getElementById('results-content'); 
  container.innerHTML = "";
  
  // 중복된 파트 제거 (최신순 정렬 등 필요 시 로직 추가 가능)
  const uniqueParts = [];
  const filteredData = data.filter(row => { 
      if (row.part && !uniqueParts.includes(row.part)) { 
          uniqueParts.push(row.part); 
          return true; 
      } 
      return false; 
  });
  
  // 유닛 1~8까지 카드 생성
  for (let u = 0; u < 8; u++) {
    const card = document.createElement('div'); 
    card.style.cssText = "background:#222; border:1px solid #333; border-radius:15px; padding:15px; margin-bottom:15px; text-align:left;";
    
    let html = `<h3 style="color:#39ff14; border-bottom:1px solid #333; padding-bottom:5px;">Unit ${u+1}</h3>`;
    
    filteredData.forEach(row => {
      let val = row.units[u] || "-";
      // 숫자인 경우 % 붙이기, 텍스트(시간/횟수)는 그대로 출력
      if (!isNaN(val) && val !== "" && String(val).indexOf(':') === -1 && String(val).indexOf('회') === -1) {
          val = Math.round(parseFloat(val) * 100) + "%";
      }
      
      // 100%이거나 완료된 항목은 초록색 표시
      const isDone = (val === "100%" || String(val).includes("완료"));
      const color = isDone ? "#39ff14" : "#fff";
      
      html += `<div style="display:flex; justify-content:space-between; margin-top:5px; font-size:14px;">
                 <span style="color:#aaa;">${row.part}</span>
                 <span style="color:${color}; font-weight:bold;">${val}</span>
               </div>`;
    });
    
    card.innerHTML = html; 
    container.appendChild(card);
  }
}

// ======================================================
// 7. 하단 네비게이션 및 리포트 (기능 완벽 복구)
// ======================================================

// [1] 리포트 페이지 보기 (함수명을 showReport로 변경하여 버튼과 연결)
window.showReport = async function() {
  const phoneInput = document.getElementById("phone-input");
  const phone = phoneInput ? phoneInput.value.trim() : "";
  
  if (!phone) return showCustomModal("로그인 정보가 없습니다.");

  showCustomModal("데이터를 불러오는 중...", null, false); // 로딩 표시

  try {
    // [핵심] 사용자님이 주신 원본 로직 그대로 사용 (action=getResults)
    const res = await fetch(`${GOOGLE_SCRIPT_URL}?action=getResults&phone=${phone}`);
    const data = await res.json();
    
    closeCustomModal();
    renderResultsCards(data); // 데이터 렌더링
    showBox('results-box');   // 화면 전환

  } catch (e) { 
      console.error(e);
      showCustomModal("데이터 로드 실패"); 
  }
};

// [2] 리포트 카드 디자인 렌더링 (수정됨: AS Correction 15분 이상 시 초록색)
function renderResultsCards(data) {
  const container = document.getElementById('results-box');
  
  // 화면 고정 및 스크롤 설정
  container.className = "fixed top-[80px] bottom-[90px] left-0 right-0 z-30 bg-black overflow-y-auto no-scrollbar px-6 pb-10 flex flex-col";
  
  // 헤더
  let htmlContent = `
      <div class="mt-4 mb-6 text-center shrink-0">
          <h2 class="text-[#39FF14] text-lg font-bold">Progress Report</h2>
          <p class="text-neutral-500 text-xs mt-1">학습 현황 분석</p>
      </div>
      <div id="results-content" class="space-y-4 w-full flex-1">
  `;

  // 중복 데이터 제거
  const uniqueParts = [];
  const filteredData = data.filter(row => { 
      if (row.part && !uniqueParts.includes(row.part)) { 
          uniqueParts.push(row.part); 
          return true; 
      } 
      return false; 
  });
  
  // Unit 1~8 카드 생성
  for (let u = 0; u < 8; u++) {
    htmlContent += `
        <div class="w-full bg-[#1c1c1c] rounded-2xl p-5 border border-neutral-800 shadow-lg mb-4">
            <h3 class="text-[#39FF14] font-bold text-base border-b border-neutral-800 pb-2 mb-3 tracking-wider">
                Unit ${u+1}
            </h3>
            <div class="space-y-2">
    `;
    
    filteredData.forEach(row => {
      let val = row.units[u] || "-";
      
      // % 변환 로직 (숫자만 있을 때)
      if (!isNaN(val) && val !== "" && String(val).indexOf(':') === -1 && String(val).indexOf('회') === -1 && String(val).indexOf('분') === -1) {
          val = Math.round(parseFloat(val) * 100) + "%";
      }
      
      // [기존 조건] 100%이거나 '완료' 글자가 있으면 통과
      let isDone = (val === "100%" || String(val).includes("완료"));

      // ⭐ [여기가 추가된 핵심 부분입니다!] ⭐
      // 파트 이름이 "AS Correction"이고, 내용에 "분"이 들어있으면 시간을 확인합니다.
      if (row.part === "AS Correction" && typeof val === 'string' && val.includes('분')) {
          // "16분 30초" 같은 문자열에서 숫자(16)만 뽑아냅니다.
          const minutes = parseInt(val); 
          // 그 숫자가 15 이상이면 완료(초록색) 처리!
          if (!isNaN(minutes) && minutes >= 15) {
              isDone = true;
          }
      }

      // 색상 적용
      const colorClass = isDone ? "text-[#39FF14] font-bold" : "text-white font-medium";
      const icon = isDone ? "check_circle" : "remove_circle_outline";
      const iconColor = isDone ? "text-[#39FF14]" : "text-neutral-700";

      htmlContent += `
          <div class="flex justify-between items-center text-sm">
              <span class="text-neutral-400 text-xs">${row.part}</span>
              <div class="flex items-center gap-2">
                  <span class="${colorClass}">${val}</span>
                  <span class="material-icons-round ${iconColor} text-sm">${icon}</span>
              </div>
          </div>
      `;
    });

    htmlContent += `</div></div>`; 
  }

  htmlContent += `</div>`; 

  // Back 버튼
  htmlContent += `
      <div class="mt-8 w-full shrink-0">
          <button onclick="showMenu()" class="w-full py-4 bg-[#1c1c1c] text-neutral-400 font-bold rounded-xl border border-neutral-800 active:border-white active:text-white transition-all text-sm uppercase tracking-wider">
              Back to Menu
          </button>
      </div>
  `;

  container.innerHTML = htmlContent;
}

window.showRanking = function() {
    showCustomModal("🏆기능 준비중입니다.\n(Ranking Coming Soon)");
};

// ======================================================
// 8. 프로필 (달력 & 정보)
// ======================================================

// [추가] 프로필 데이터 불러오기
window.showProfile = async function() {
    const phoneInput = document.getElementById("phone-input");
    const phone = phoneInput ? phoneInput.value.trim() : "";
    
    if (!phone) return showCustomModal("로그인 정보가 없습니다.");

    showCustomModal("프로필 정보를 불러오는 중...", null, false);

    try {
        const res = await fetch(`${GOOGLE_SCRIPT_URL}?action=getProfile&phone=${phone}`);
        const data = await res.json();
        
        closeCustomModal();
        
        if (data.result === "success") {
            renderProfilePage(data);
            showBox('profile-box'); // 화면 전환
        } else {
            showCustomModal("학생 정보를 찾을 수 없습니다.");
        }

    } catch (e) {
        console.error(e);
        showCustomModal("프로필 로드 실패");
    }
};

// [수정] 프로필 화면 그리기 (로고 겹침 해결: 상단 여백 증가)
function renderProfilePage(data) {
    let container = document.getElementById('profile-box');
    
    if (!container) {
        container = document.createElement('div');
        container.id = 'profile-box';
        document.body.appendChild(container);
    }

    // [수정 포인트] pt-4 -> pt-12로 변경하여 상단 여백을 넉넉하게 확보
    container.className = "fixed top-[80px] bottom-[90px] left-0 right-0 z-30 bg-black overflow-y-auto no-scrollbar px-6 flex flex-col items-center pt-12";

    // 날짜 계산
    const date = new Date();
    const curYear = date.getFullYear();
    const curMonth = date.getMonth(); 
    const monthNames = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
    const currentMonthName = monthNames[curMonth];

    // 달력 HTML 생성
    let calendarHtml = generateCalendarHTML(curYear, curMonth, data.attendance || []);

    container.innerHTML = `
        <div class="w-full bg-[#0a0a0a] border border-[#333] border-l-4 border-l-[#39FF14] rounded-xl p-6 shadow-[0_0_20px_rgba(57,255,20,0.1)] mb-8 relative overflow-hidden">
            
            <div class="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-[#39FF14]/10 to-transparent"></div>
            
            <div class="relative z-10">
                <p class="text-[#39FF14] font-mono text-[10px] font-bold tracking-[0.2em] mb-4 flex items-center gap-2">
                    <span class="w-2 h-2 bg-[#39FF14] rounded-full animate-pulse"></span>
                    STUDENT IDENTITY
                </p>

                <div class="flex justify-between items-start mb-6">
                    <div>
                        <h1 class="text-white text-4xl font-black tracking-tight leading-none mb-1 drop-shadow-md">${data.name}</h1>
                        <p class="text-neutral-500 text-[10px] font-mono uppercase tracking-widest">Agent Name</p>
                    </div>
                    <div class="text-right">
                        <div class="inline-block border border-[#39FF14] px-3 py-1 rounded bg-[#39FF14]/10">
                            <h1 class="text-[#39FF14] text-xl font-black tracking-tighter leading-none">${data.level}</h1>
                        </div>
                        <p class="text-neutral-500 text-[10px] font-mono uppercase tracking-widest mt-1">Level</p>
                    </div>
                </div>

                <div class="bg-[#1c1c1c] rounded-lg p-3 border border-neutral-800 flex items-center gap-3">
                    <span class="material-icons-round text-neutral-400 text-lg">schedule</span>
                    <div>
                        <h2 class="text-white text-sm font-bold tracking-wide">${data.classInfo}</h2>
                        <p class="text-neutral-600 text-[10px] font-bold uppercase tracking-widest">Assigned Class</p>
                    </div>
                </div>
            </div>
        </div>

        <div class="w-full mb-8">
            <div class="flex items-center justify-between mb-4 px-1">
                <div class="flex items-center gap-2">
                    <span class="material-icons-round text-[#39FF14] text-base">date_range</span>
                    <h3 class="text-white font-bold text-lg tracking-wider font-mono">${currentMonthName} <span class="text-neutral-500 text-sm">${curYear}</span></h3>
                </div>
            </div>

            <div class="bg-[#111] rounded-2xl p-4 border border-neutral-800 shadow-lg">
                <div class="grid grid-cols-7 text-center mb-3 border-b border-neutral-800 pb-2">
                    <span class="text-[#ff4757] text-[10px] font-black font-mono">SUN</span>
                    <span class="text-neutral-500 text-[10px] font-bold font-mono">MON</span>
                    <span class="text-neutral-500 text-[10px] font-bold font-mono">TUE</span>
                    <span class="text-neutral-500 text-[10px] font-bold font-mono">WED</span>
                    <span class="text-neutral-500 text-[10px] font-bold font-mono">THU</span>
                    <span class="text-neutral-500 text-[10px] font-bold font-mono">FRI</span>
                    <span class="text-[#39FF14] text-[10px] font-black font-mono">SAT</span>
                </div>

                <div class="grid grid-cols-7 gap-2 text-center">
                    ${calendarHtml}
                </div>
            </div>
        </div>

        <div class="mt-auto w-full py-8">
            <button onclick="logout()" class="w-full py-4 rounded-xl border border-neutral-800 text-neutral-500 font-bold tracking-[0.2em] text-xs hover:bg-[#39FF14]/10 hover:text-[#39FF14] hover:border-[#39FF14] active:scale-95 transition-all uppercase flex items-center justify-center gap-2 group">
                <span class="material-icons-round text-sm group-hover:text-[#39FF14] transition-colors">power_settings_new</span>
                System Logout
            </button>
        </div>
    `;
}

// [수정] 달력 HTML 생성 함수 (디자인 디테일 수정)
function generateCalendarHTML(year, month, attendedDays) {
    const firstDay = new Date(year, month, 1).getDay(); 
    const daysInMonth = new Date(year, month + 1, 0).getDate(); 
    
    let html = "";
    
    // 빈 칸
    for (let i = 0; i < firstDay; i++) {
        html += `<div class="h-10"></div>`;
    }
    
    // 날짜
    for (let day = 1; day <= daysInMonth; day++) {
        const isAttended = attendedDays.includes(day);
        
        let content = `<span class="text-neutral-500 text-sm font-medium font-mono">${day}</span>`;
        let bgClass = "bg-transparent"; 
        let borderClass = "border border-transparent"; 

        if (isAttended) {
            // [수정] 출석한 날: 네온 글로우 효과 강화
            content = `<span class="text-[#111] text-sm font-black font-mono relative z-10">${day}</span>`;
            bgClass = "bg-[#39FF14]"; 
            borderClass = "border border-[#39FF14] shadow-[0_0_10px_#39FF14]";
        } else {
            // 미출석: 마우스 올리면 살짝 표시
            borderClass = "border border-neutral-900";
        }
        
        html += `
            <div class="h-10 rounded-lg ${bgClass} ${borderClass} flex items-center justify-center relative transition-all">
                 ${content}
            </div>
        `;
    }
    
    return html;
}

// [추가] 로그아웃 함수
window.logout = function() {
    showCustomModal("로그아웃 하시겠습니까?", () => {
        location.reload(); // 가장 간단한 방법: 새로고침
    });
};
