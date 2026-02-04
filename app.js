// ======================================================
// 1. 기본 설정 및 상수 영역
// ======================================================
const REPO_USER = "jaydo14"; 
const REPO_NAME = "english-app";
const BASE_URL = `https://raw.githubusercontent.com/${REPO_USER}/${REPO_NAME}/main/contents/`;
// ⭐ [필수] 구글 앱스 스크립트 '새 배포' URL 확인
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxJI0I9X1MmFSCUPuNCTMCBhIdokxjEEJWmR5iIoophqYmEwsla5uMshLAKz6i6NiiY/exec"; 

let currentTotalCycles = 18; 
let currentPart = "Script"; 
let userName = ""; 
let currentType = ""; 
let currentUnit = 1;
let currentData = []; 
let index = 0;
let cycle = 1;
let isRepeating = false;

// [기능: 반복듣기 상태 보존 변수]
let repeatIndex = 0; 
let repeatCycleCount = 0; 

// [기능: 랜덤 칭찬 멘트]
const praiseList = ["Excellent!", "Great job!", "Amazing!", "Perfect!", "Fantastic!", "Superb!", "Unbelievable!"];

const player = new Audio();
let wakeLock = null;
let asTimer = null;
let asSeconds = 0;
let asData = null;
let isAlertShown = false; 
// [기능: 이어하기 상태 플래그]
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
// 2. UI 제어 및 유틸리티 (저장/복원 로직 포함)
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

window.goBackToUnits = function() { showBox('unit-selector'); };

window.showMenu = function() { 
    stopRepeatAudio(); 
    if (asTimer) clearInterval(asTimer); 
    showBox('menu-box'); 
};

// [기능: 로컬 저장 - 타이머 및 위치 기억]
function saveStatus() {
  const status = {
    type: currentType, unit: currentUnit, part: currentPart,
    index: index, cycle: cycle,
    repeatIndex: repeatIndex, repeatCycle: repeatCycleCount,
    timer: asSeconds, 
    userName: userName
  };
  localStorage.setItem("myEnglishAppStatus", JSON.stringify(status));
}

// [기능: 로컬 불러오기]
function loadStatus() {
  const saved = localStorage.getItem("myEnglishAppStatus");
  if (saved) return JSON.parse(saved);
  return null;
}

// [기능: 각 모드 진입 시 이어하기 여부 체크]
function checkResumeStatus(partName) {
    const saved = loadStatus();
    // 저장된 기록이 있고, 현재 진입하려는 교재/유닛/파트가 일치하면 복원 모드 ON
    if (saved && saved.type === currentType && saved.unit === currentUnit && saved.part === partName) {
        index = saved.index || 0;
        cycle = saved.cycle || 1;
        repeatIndex = saved.repeatIndex || 0;
        repeatCycleCount = saved.repeatCycle || 0;
        asSeconds = saved.timer || 0;
        isRestoring = true; 
    } else {
        // 아니면 초기화
        index = 0; cycle = 1; repeatIndex = 0; repeatCycleCount = 0; asSeconds = 0;
        isRestoring = false;
    }
}

// ======================================================
// 3. 로그인 (납치 방지: 유닛 선택 화면 고정)
// ======================================================
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
        renderUnitButtons();
        // [확인] 로그인 후 바로 넘어가지 않고 선택 화면 유지
        showBox('unit-selector'); 
        showCustomModal(`${userName}님, 🔥오늘도 화이팅 입니다!🔥`);
      } else {
        showCustomModal("등록되지 않은 번호입니다.");
        loginBtn.disabled = false; loginBtn.innerText = "Login";
      }
    }).catch(() => { showCustomModal("접속 오류"); loginBtn.disabled = false; });
};

function renderUnitButtons() {
  const container = document.getElementById("unit-buttons");
  container.innerHTML = ""; 
  const currentTitles = bookDatabase[currentType] || {};
  for (let i = 1; i <= 8; i++) {
    const btn = document.createElement("button");
    const titleText = currentTitles[i] ? `<br><span class="unit-title" style="font-size:12px; font-weight:normal; color:#000;">${currentTitles[i]}</span>` : "";
    btn.innerHTML = `Unit ${i}${titleText}`;
    btn.onclick = () => { currentUnit = i; showBox('menu-box'); };
    container.appendChild(btn);
  }
}

// ======================================================
// 4. 학습 엔진 (Script/Vocab - 흔들림, 스킵, 50% 통과)
// ======================================================
window.startScriptMode = async function() { 
    currentPart = "Script"; 
    checkResumeStatus("Script"); // 이어하기 체크
    currentTotalCycles = 18; 
    loadStudyData(`${currentType}u${currentUnit}.json`); 
};

window.startVocaMode = async function() { 
    currentPart = "Vocab"; // [확인] 시트와 일치하는 파트명
    checkResumeStatus("Vocab"); // 이어하기 체크
    currentTotalCycles = 10; 
    loadStudyData(`${currentType}u${currentUnit}_voca.json`); 
};

async function loadStudyData(fileName) {
  isAlertShown = false; 
  try {
    const res = await fetch(BASE_URL + currentType + "u/" + fileName);
    currentData = await res.json();
    
    // 이어하기가 아니면 인덱스 초기화
    if (!isRestoring) {
        index = 0; cycle = 1;
    }
    
    // [기능: 스킵 버튼 생성]
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
    
    // 버튼 상태 설정
    document.getElementById("start-btn").innerText = isRestoring ? "Listen again" : "Start";
    document.getElementById("skip-btn").style.display = isRestoring ? "inline-block" : "none";

    updateProgress(); showBox('study-box');
    
    // 이어하기 상태면 바로 재생 시작
    if (isRestoring) {
        playSentence();
        isRestoring = false; // 한 번 실행 후 해제
    }
  } catch (e) { showCustomModal("파일 로드 실패"); }
}

window.startStudy = function () { 
    document.getElementById("start-btn").innerText = "Listen again";
    document.getElementById("skip-btn").style.display = "inline-block";
    playSentence(); 
};

window.skipSentence = function() { try { recognizer.abort(); } catch(e) {} nextStep(); };

function playSentence() {
  const sText = document.getElementById("sentence");
  const item = currentData[index];
  
  sText.classList.remove("shake"); // 흔들림 초기화
  sText.innerText = item.en; sText.style.color = "#fff";
  document.getElementById("sentence-kor").innerText = item.ko;
  
  updateProgress(); // 진행 시마다 저장
  
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

  // [기능: 50% 일치 통과]
  if (checkSimilarity(spoken, target) >= 0.5) {
    successSound.play(); 
    // [기능: 랜덤 칭찬]
    const praise = praiseList[Math.floor(Math.random() * praiseList.length)];
    sText.innerText = praise; 
    sText.style.color = "#39ff14";
    setTimeout(nextStep, 700);
  } else {
    failSound.play(); 
    sText.innerText = "Try again"; sText.style.color = "#ff4b4b";
    // [기능: 흔들림 효과 복구]
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
  sendDataToGoogle(currentPart, percent + "%"); // 저장
  if (percent >= 100 && !isAlertShown) { 
    isAlertShown = true; triggerFireworkConfetti(); 
    showCustomModal(`${currentPart} 100% 달성! 🎉`, () => playSentence()); return; 
  }
  playSentence();
};

// ======================================================
// 5. AS Correction (타이머 이어하기 + 저장)
// ======================================================
window.startASMode = async function() {
  currentPart = "AS Correction"; 
  checkResumeStatus("AS Correction"); // 이어하기 체크
  
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
    
    // 이어하기 상태면 자동으로 시작
    if(isRestoring) {
       setTimeout(() => startASStudy(), 100);
    }
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
    saveStatus(); // 1초마다 상태 저장
  }, 1000);
  playASAudio();
};
window.playASAudio = () => { player.src = BASE_URL + currentType + "u/" + asData.audio; player.play(); };
window.finishASStudy = function() {
  clearInterval(asTimer); const timeStr = Math.floor(asSeconds/60) + "분 " + (asSeconds%60) + "초";
  sendDataToGoogle("AS Correction", timeStr); // 저장
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

window.submitAccurateSpeaking = async function() {
  const text = document.getElementById('student-text-input').value.trim(); if(!text) return showCustomModal("내용 입력 필수");
  showBox('dev-box');
  const payload = { action: "uploadAS", phone: document.getElementById("phone-input").value.trim(), unit: "Unit " + currentUnit, studentText: text, audioData: window.lastAudioBase64 };
  fetch(GOOGLE_SCRIPT_URL, { method: "POST", body: JSON.stringify(payload) })
    .then(res => res.json()).then(data => { if(data.result === "success") showCustomModal("제출 성공!", () => showMenu()); });
};

// ======================================================
// 6. 반복듣기 (이어듣기 + 2초 대기 + 형광녹색 하이라이트)
// ======================================================
window.startRepeatMode = async function() {
  currentPart = "반복듣기";
  try {
    const res = await fetch(`${BASE_URL}${currentType}u/${currentType}u${currentUnit}.json`);
    currentData = await res.json();
    
    checkResumeStatus("반복듣기"); // 이어하기 체크

    showBox('repeat-box');
    const container = document.getElementById('repeat-box');
    // [확인] 버튼과 UI 재생성
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
      // [기능: 형광녹색 적용을 위한 클래스 추가]
      div.innerHTML = `<div class="en-text" style="color:#fff; font-size:15px;">${item.en}</div><div style="color:#666; font-size:12px;">${item.ko}</div>`;
      list.appendChild(div);
    });
    
    // 이어하기 상태면 버튼 텍스트 변경
    if(isRestoring && repeatIndex > 0) {
        document.getElementById('repeat-start-btn').innerText = "Resume";
    }
  } catch (e) { showCustomModal("로드 실패"); }
};

window.runRepeatAudio = async function() {
  const countInput = document.getElementById('repeat-count');
  const totalCycles = parseInt(countInput.value) || 3;
  const btn = document.getElementById('repeat-start-btn');
  if (isRepeating) return; isRepeating = true; btn.disabled = true; btn.innerText = "Playing...";

  // [기능: 이어듣기 루프]
  for (let c = repeatCycleCount; c < totalCycles; c++) {
    repeatCycleCount = c;
    let sIdx = (c === repeatCycleCount) ? repeatIndex : 0; 
    
    for (let i = sIdx; i < currentData.length; i++) {
      if (!isRepeating) { repeatIndex = i; saveStatus(); return; } // 정지 시 저장
      
      await new Promise(resolve => {
        // 폰트 색상 초기화
        document.querySelectorAll('.repeat-item .en-text').forEach(el => el.style.color = "#fff");
        document.querySelectorAll('.repeat-item').forEach(el => el.style.background = "transparent");
        
        // [기능: 형광녹색 하이라이트]
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
      repeatIndex = i; saveStatus(); // 문장 단위 저장
    }
    
    repeatIndex = 0; 
    sendDataToGoogle("반복듣기", (c + 1) + "회 완료"); 

    // [기능: 2초 대기]
    if (c < totalCycles - 1 && isRepeating) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  isRepeating = false; btn.disabled = false; btn.innerText = "Start"; repeatIndex = 0; repeatCycleCount = 0;
  saveStatus(); 
};

window.stopRepeatAudio = () => { 
  isRepeating = false; 
  player.pause(); 
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
  saveStatus(); // 진행될 때마다 저장
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
