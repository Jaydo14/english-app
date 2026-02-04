// ======================================================
// 1. 기본 설정 및 상수
// ======================================================
const REPO_USER = "jaydo14"; 
const REPO_NAME = "english-app";
const BASE_URL = `https://raw.githubusercontent.com/${REPO_USER}/${REPO_NAME}/main/contents/`;
// ⭐ [필수] Apps Script '새 배포' URL을 여기에 넣어주세요!
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwzLXRA3SNLjwp8q5tw83dOswKPzpyYb41bVNMqyOnJ2LKlxASBRKzcsvQq-OK4ok1q/exec"; 

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
function showBox(boxId) {
  const boxes = ['login-box', 'unit-selector', 'menu-box', 'study-box', 'repeat-box', 'dev-box', 'as-box', 'results-box', 'as-record-box'];
  boxes.forEach(id => {
    const el = document.getElementById(id);
    if(el) el.style.display = (id === boxId) ? 'block' : 'none';
  });
  document.getElementById("app").style.display = "block";
  window.scrollTo(0, 0); 
}

function showCustomModal(msg, callback = null) {
  player.pause(); 
  document.getElementById('modal-msg').innerText = msg;
  document.getElementById('custom-modal').style.display = 'flex';
  modalCallback = callback; 
}

function closeCustomModal() {
  document.getElementById('custom-modal').style.display = 'none';
  if (modalCallback) { modalCallback(); modalCallback = null; }
}

window.goBackToUnits = () => showBox('unit-selector');
window.showMenu = () => { stopRepeatAudio(); if (asTimer) clearInterval(asTimer); showBox('menu-box'); };

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
  loginBtn.disabled = true; loginBtn.innerText = "Checking...";

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

// [수정] 유닛 버튼 렌더링 (카드 디자인 적용)
function renderUnitButtons() {
  const container = document.getElementById("unit-buttons");
  container.innerHTML = ""; 
  const currentTitles = bookDatabase[currentType] || {};
  
  // 디자인을 위한 아이콘 리스트 (순서대로 적용)
  const icons = ["music_note", "explore", "local_cafe", "movie", "restaurant", "flight_takeoff", "celebration", "school"];

  for (let i = 1; i <= 8; i++) {
    const title = currentTitles[i] || "Unknown";
    const icon = icons[i-1] || "star"; // 아이콘 매칭

    const btn = document.createElement("button");
    // 디자인 클래스 적용 (Tailwind)
    btn.className = "group relative w-full p-5 rounded-2xl transition-all duration-300 bg-[#171717] border border-neutral-800 hover:border-[#39FF14] flex items-center justify-between overflow-hidden active:scale-[0.98]";
    
    btn.innerHTML = `
      <div class="flex items-center gap-4 z-10">
        <div class="w-12 h-12 rounded-xl bg-[#39FF14]/10 flex items-center justify-center text-[#39FF14]">
          <span class="material-icons-round text-2xl">${icon}</span>
        </div>
        <div class="text-left">
          <p class="text-[10px] font-mono uppercase tracking-widest text-[#39FF14] mb-0.5">Unit ${String(i).padStart(2, '0')}</p>
          <h3 class="text-lg font-bold text-white group-hover:text-[#39FF14] transition-colors">${title}</h3>
        </div>
      </div>
      <span class="material-icons-round text-neutral-600 group-hover:text-[#39FF14] transition-colors z-10">arrow_forward_ios</span>
      
      <div class="absolute inset-0 bg-[#39FF14]/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
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

async function loadStudyData(fileName) {
  isAlertShown = false; 
  try {
    const res = await fetch(BASE_URL + currentType + "u/" + fileName);
    currentData = await res.json();
    
    if (!isRestoring) {
        index = 0; cycle = 1;
    }
    
    // 스킵 버튼 생성
    const studyBox = document.getElementById('study-box');
    if (studyBox && !document.getElementById('skip-btn')) {
         const startB = document.getElementById('start-btn');
         const skipBtn = document.createElement('button');
         skipBtn.id = 'skip-btn'; skipBtn.innerText = 'Skip';
         skipBtn.onclick = () => window.skipSentence();
         skipBtn.className = 'sub-action-btn'; 
         skipBtn.style.display = 'none'; skipBtn.style.marginLeft = '10px'; skipBtn.style.background = '#555';
         if(startB) startB.parentNode.insertBefore(skipBtn, startB.nextSibling);
    }
    
    // [수정] 무조건 Start로 표시 (이어하기여도 자동재생 안 함)
    document.getElementById("start-btn").innerText = "Start";
    document.getElementById("skip-btn").style.display = isRestoring ? "inline-block" : "none";

    updateProgress(); showBox('study-box');
    
    // [수정] 이어하기면 텍스트만 보여주고 대기
    if (isRestoring) {
        const sText = document.getElementById("sentence");
        const item = currentData[index];
        sText.innerText = item.en; sText.style.color = "#fff";
        document.getElementById("sentence-kor").innerText = item.ko;
    }
  } catch (e) { showCustomModal("파일 로드 실패"); }
}

window.startStudy = function () { 
    document.getElementById("start-btn").innerText = "Listen again";
    document.getElementById("skip-btn").style.display = "inline-block";
    
    // Start 버튼을 눌렀으므로 복원 모드 해제 및 재생 시작
    if (isRestoring) isRestoring = false;
    requestWakeLock(); // [추가] 공부 시작할 때 화면 켜짐 유지!
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

function renderASPage() {
  const container = document.getElementById('as-box');
  const format = (t) => t ? String(t).replace(/\n/g, '<br>').replace(/\[(.*?)\]/g, '<span style="color:#ff4b4b; font-weight:bold;">$1</span>') : "";
  container.innerHTML = `
    <h2 style="color:#39ff14;">AS Correction</h2>
    <div style="text-align:left; border-bottom:1px solid #333; padding-bottom:10px; margin-bottom:15px;"><p style="color:#39ff14; font-size:12px;">[Question]</p><p style="font-size:18px;">${format(asData.question)}</p></div>
    <div style="text-align:left; background:#222; padding:15px; border-radius:12px; margin-bottom:10px;"><p style="color:#888; font-size:12px;">My Answer</p><p style="color:#aaa;">${format(asData.original)}</p></div>
    <div style="text-align:left; background:#222; padding:15px; border-radius:12px; margin-bottom:20px;"><p style="color:#39ff14; font-size:12px;">Feedback</p><p style="font-size:17px;">${format(asData.corrected)}</p></div>
    <div id="as-timer" style="font-size:28px; margin-bottom:20px; color:#39ff14; font-weight:bold;">
        ${Math.floor(asSeconds/60).toString().padStart(2,'0')}:${(asSeconds%60).toString().padStart(2,'0')}
    </div>
    <button id="as-start-btn" onclick="startASStudy()">Start</button>
    <div id="as-controls" style="display:none; flex-direction:column; gap:10px;"><button onclick="playASAudio()" style="background:#555;">질문 다시듣기</button><button onclick="finishASStudy()" style="background:#39ff14; color:#000;">학습 완료</button></div>
    <button onclick="showMenu()" class="sub-action-btn" style="margin-top:15px;">Back</button>`;
    
    // [수정] 이어하기여도 "Resume"이 아닌 "Start" 버튼 표시 (자동 재생 X)
    document.getElementById('as-start-btn').innerText = "Start";
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

window.startAccurateSpeakingMode = async function() {
  const phone = document.getElementById("phone-input").value.trim(); showBox('dev-box');
  try {
    const res = await fetch(`${GOOGLE_SCRIPT_URL}?action=getAS&phone=${phone}&unit=Unit ${currentUnit}`);
    asData = await res.json();
    document.getElementById('student-text-input').value = "";
    if (asData && asData.isSubmitted) {
      document.getElementById('as-q-text').innerText = "이미 정상적으로 전송되었습니다. ✔";
      showBox('as-record-box'); document.getElementById('as-listen-btn').style.display = 'none'; document.getElementById('recording-ui').style.display = 'none'; document.getElementById('submit-ui').style.display = 'none'; return;
    }
    document.getElementById('as-q-text').innerText = asData.question || "질문 없음";
    showBox('as-record-box'); document.getElementById('as-listen-btn').style.display = 'block';
  } catch (e) { showCustomModal("로드 실패"); }
};

// [복구] Accurate Speaking: 질문 듣기
window.listenQuestion = function() {
  if (!asData || !asData.audio) return showCustomModal("오디오 정보가 없습니다.");
  
  // 화면 꺼짐 방지 요청
  requestWakeLock();
  
  player.src = BASE_URL + currentType + "u/" + asData.audio;
  player.play().catch(() => showCustomModal("오디오 재생 실패"));
  
  // 오디오가 끝나면 자동으로 녹음 준비
  player.onended = () => { startRecording(); }; 
};

// [복구] 녹음 시작
async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream); 
    audioChunks = [];
    
    document.getElementById('as-listen-btn').style.display = 'none';
    document.getElementById('recording-ui').style.display = 'block';
    
    mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
    mediaRecorder.onstop = () => { processRecording(); };
    mediaRecorder.start();
    
    recSeconds = 0;
    // 60초 제한 타이머
    if (recordingTimer) clearInterval(recordingTimer);
    recordingTimer = setInterval(() => { 
        recSeconds++; 
        document.getElementById('rec-timer').innerText = `00:${recSeconds.toString().padStart(2,'0')}`; 
        if (recSeconds >= 60) stopRecording(); 
    }, 1000);
    
  } catch (e) { showCustomModal("마이크 권한이 필요합니다."); }
}

// [복구] 녹음 중지
window.stopRecording = function() { 
    if (mediaRecorder && mediaRecorder.state !== "inactive") { 
        mediaRecorder.stop(); 
        clearInterval(recordingTimer); 
        document.getElementById('recording-ui').style.display = 'none'; 
        document.getElementById('submit-ui').style.display = 'block'; 
    } 
};

// [복구] 녹음 데이터 처리 (Base64 변환)
async function processRecording() { 
    const blob = new Blob(audioChunks, { type: 'audio/webm' }); 
    const reader = new FileReader(); 
    reader.readAsDataURL(blob); 
    reader.onloadend = () => { 
        window.lastAudioBase64 = reader.result.split(',')[1]; 
    }; 
}

window.submitAccurateSpeaking = async function() {
  const text = document.getElementById('student-text-input').value.trim(); if(!text) return showCustomModal("내용 입력 필수");
  showBox('dev-box');
  const payload = { action: "uploadAS", phone: document.getElementById("phone-input").value.trim(), unit: "Unit " + currentUnit, studentText: text, audioData: window.lastAudioBase64 };
  fetch(GOOGLE_SCRIPT_URL, { method: "POST", body: JSON.stringify(payload) })
    .then(res => res.json()).then(data => { if(data.result === "success") showCustomModal("제출 성공!", () => showMenu()); });
};

// ======================================================
// 6. 반복듣기 (누적 저장 + 2초 대기 + 하이라이트 + 버튼 대기)
// ======================================================
window.startRepeatMode = async function() {
  currentPart = "반복듣기";
  try {
    const res = await fetch(`${BASE_URL}${currentType}u/${currentType}u${currentUnit}.json`);
    currentData = await res.json();
    checkResumeStatus("반복듣기"); 
    showBox('repeat-box');
    
    const container = document.getElementById('repeat-box');
    container.innerHTML = `
      <h2 style="color:#39ff14;">Listen & Repeat</h2>
      <div style="margin-bottom:15px; color:#fff;">
        반복 횟수: <input type="number" id="repeat-count" value="3" min="1" style="width:50px; background:#222; color:#39ff14; border:1px solid #333; text-align:center;"> 사이클
      </div>
      <div id="repeat-list" style="height:350px; overflow-y:auto; border:1px solid #333; padding:10px; border-radius:10px; margin-bottom:15px;"></div>
      <div style="display:flex; gap:10px; justify-content:center;">
        <button id="repeat-start-btn" onclick="runRepeatAudio()" style="background:#39ff14; color:#000; width:120px;">Start</button>
        <button onclick="stopRepeatAudio()" style="background:#ff4b4b; color:#fff; width:120px;">Stop</button>
      </div>
      <button onclick="stopRepeatAudio(); showMenu();" class="sub-action-btn" style="margin-top:15px;">Back to Menu</button>`;
    
    const list = document.getElementById('repeat-list');
    currentData.forEach((item, idx) => {
      const div = document.createElement('div'); div.id = `repeat-${idx}`; div.className = 'repeat-item';
      div.style.padding = "10px"; div.style.borderBottom = "1px solid #222"; div.style.textAlign = "left";
      div.innerHTML = `<div class="en-text" style="color:#fff; font-size:15px;">${item.en}</div><div style="color:#666; font-size:12px;">${item.ko}</div>`;
      list.appendChild(div);
    });
    
    // [수정] 이어하기여도 "Start"로 표시
    document.getElementById('repeat-start-btn').innerText = "Start";
  } catch (e) { showCustomModal("로드 실패"); }
};

window.runRepeatAudio = async function() {
  const countInput = document.getElementById('repeat-count');
  const totalCycles = parseInt(countInput.value) || 3;
  const btn = document.getElementById('repeat-start-btn');
  if (isRepeating) return; isRepeating = true; btn.disabled = true; btn.innerText = "Playing...";

  if (isRestoring) isRestoring = false; 

  for (let c = repeatCycleCount; c < totalCycles; c++) {
    repeatCycleCount = c;
    let sIdx = (c === repeatCycleCount) ? repeatIndex : 0; 
    
    for (let i = sIdx; i < currentData.length; i++) {
      if (!isRepeating) { repeatIndex = i; saveStatus(); return; } 
      
      await new Promise(resolve => {
        document.querySelectorAll('.repeat-item .en-text').forEach(el => el.style.color = "#fff");
        document.querySelectorAll('.repeat-item').forEach(el => el.style.background = "transparent");
        
        const el = document.getElementById(`repeat-${i}`);
        if(el) { 
            el.style.background = "#1a3a1a"; 
            const enDiv = el.querySelector('.en-text');
            if(enDiv) enDiv.style.color = "#39ff14"; 
            el.scrollIntoView({ behavior: 'smooth', block: 'center' }); 
        }
        player.src = `${BASE_URL}${currentType}u/${currentData[i].audio}`; player.play();
        player.onended = resolve;
      });
      repeatIndex = i; saveStatus();
    }
    
    repeatIndex = 0; 
    // [수정] 사이클 완료 시 무조건 "+1회" 추가 요청
    sendDataToGoogle("반복듣기", "1회 완료"); 

    if (c < totalCycles - 1 && isRepeating) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  isRepeating = false; btn.disabled = false; btn.innerText = "Start"; repeatIndex = 0; repeatCycleCount = 0;
  saveStatus(); 
};

window.stopRepeatAudio = () => { 
  isRepeating = false; player.pause(); 
  const btn = document.getElementById('repeat-start-btn');
  if(btn) { btn.disabled = false; btn.innerText = "Start"; }
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
