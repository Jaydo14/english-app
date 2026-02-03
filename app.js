/* ======================================================
   1. 기본 설정 및 상수 영역
   ====================================================== */
const REPO_USER = "jaydo14"; 
const REPO_NAME = "english-app";
const BASE_URL = `https://raw.githubusercontent.com/${REPO_USER}/${REPO_NAME}/main/contents/`;
// ⭐ [주의] GAS에서 '새 배포' 후 받은 URL로 반드시 교체하세요.
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxDKQs-_3fXq3iP5RJQnpx30whtnq402mpqZtiFMakTjrAzUbQfzxYd4iGM-geyCQLb/exec"; 

let currentTotalCycles = 18; 
let currentPart = "Script"; 
let userName = ""; 

const bookDatabase = {
  "hc12": { 1: "Music", 2: "Directions", 3: "Favorite beverage", 4: "Movies", 5: "Lunch", 6: "Vacation", 7: "New years", 8: "Switch lives" },
  "fc21": { 1: "Restaurant", 2: "Birthday", 3: "Expenses", 4: "Dream job", 5: "Movies", 6: "Eating healthy", 7: "Traveling alone", 8: "Education" }
};

/* ======================================================
   2. 변수 및 오디오 설정
   ====================================================== */
let currentType = ""; 
let currentUnit = 1;
let currentData = []; 
let index = 0;
let cycle = 1;
let isRepeating = false;

// [추가] 반복듣기 이어듣기를 위한 상태 변수
let repeatIndex = 0; 
let repeatCycleCount = 0;

const player = new Audio();
let wakeLock = null;
let asTimer = null;
let asSeconds = 0;
let asData = null;
let isAlertShown = false; 

let mediaRecorder; 
let audioChunks = []; 
let recordingTimer; 
let recSeconds = 0; 
let modalCallback = null; 

const successSound = new Audio(BASE_URL + "common/success.mp3");
const failSound = new Audio(BASE_URL + "common/fail.mp3");

/* ======================================================
   3. 화면 관리 및 커스텀 팝업
   ====================================================== */
function showBox(boxId) {
  const boxes = ['login-box', 'unit-selector', 'menu-box', 'study-box', 'repeat-box', 'dev-box', 'as-box', 'results-box', 'as-record-box'];
  boxes.forEach(id => {
    const el = document.getElementById(id);
    if(el) el.style.display = (id === boxId) ? 'block' : 'none';
  });
  document.getElementById("app").style.display = "block";
  window.scrollTo(0,0);
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

async function requestWakeLock() {
  try { if ('wakeLock' in navigator) { wakeLock = await navigator.wakeLock.request('screen'); } } catch (err) {}
}

/* ======================================================
   4. 로그인 및 유닛 관리 (뒤로가기 포함)
   ====================================================== */
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
      currentType = String(data.type).toLowerCase().trim(); // 소문자 변환
      userName = data.name;
      if(renderUnitButtons()) {
        showBox('unit-selector');
        showCustomModal(`${userName}님, 🔥오늘도 화이팅 입니다!🔥`);
      } else {
        showCustomModal("교재 정보를 찾을 수 없습니다.");
        loginBtn.disabled = false; loginBtn.innerText = "Login";
      }
    } else {
      showCustomModal("등록되지 않은 번호입니다.");
      loginBtn.disabled = false; loginBtn.innerText = "Login";
    }
  }).catch(() => {
    showCustomModal("접속 오류가 발생했습니다.");
    loginBtn.disabled = false;
  });
};

function renderUnitButtons() {
  const container = document.getElementById("unit-buttons");
  if(!container) return false;
  container.innerHTML = ""; 
  const currentTitles = bookDatabase[currentType];
  if(!currentTitles) return false;

  for (let i = 1; i <= 8; i++) {
    const btn = document.createElement("button");
    const titleText = currentTitles[i] ? `<br><span class="unit-title" style="font-size:12px; font-weight:normal; color:#000;">${currentTitles[i]}</span>` : "";
    btn.innerHTML = `Unit ${i}${titleText}`;
    btn.onclick = () => { currentUnit = i; showBox('menu-box'); };
    container.appendChild(btn);
  }
  return true;
}

// [요청사항 1] 뒤로가기 버튼 기능 (유닛 선택으로)
window.goBackToUnits = function() {
  showBox('unit-selector');
};

window.showMenu = () => { 
  stopRepeatAudio(); 
  if (asTimer) clearInterval(asTimer); 
  showBox('menu-box'); 
};

/* ======================================================
   5. 학습 모드 (Script/Voca, 스킵, 흔들림)
   ====================================================== */
window.startScriptMode = async function() { 
    currentPart = "Script"; 
    currentTotalCycles = 18; 
    loadStudyData(`${currentType}u${currentUnit}.json`); 
};

window.startVocaMode = async function() { 
    currentPart = "Voca"; // [요청사항 1 해결] Voca 파트명 명시
    currentTotalCycles = 10; 
    loadStudyData(`${currentType}u${currentUnit}_voca.json`); 
};

async function loadStudyData(fileName) {
  isAlertShown = false; showBox('dev-box');
  try {
    const res = await fetch(BASE_URL + currentType + "u/" + fileName);
    currentData = await res.json();
    index = 0; cycle = 1;
    
    // UI 초기화
    const startBtn = document.getElementById("start-btn");
    if(startBtn) startBtn.innerText = "Start";
    
    // [요청사항 2] 스킵 버튼 초기화 (숨김)
    const skipBtn = document.getElementById("skip-btn");
    // 만약 HTML에 버튼이 없다면 동적으로 생성
    if (!skipBtn) {
        const controls = document.querySelector('#study-box .study-controls') || document.getElementById('study-box');
        const newSkip = document.createElement('button');
        newSkip.id = "skip-btn";
        newSkip.innerText = "Skip";
        newSkip.className = "sub-action-btn"; // 스타일 클래스
        newSkip.style.display = "none";
        newSkip.style.marginLeft = "10px";
        newSkip.style.background = "#555";
        newSkip.onclick = () => window.skipSentence();
        if(startBtn) startBtn.parentNode.insertBefore(newSkip, startBtn.nextSibling);
    } else {
        skipBtn.style.display = "none";
    }

    updateProgress(); showBox('study-box');
  } catch (e) { showCustomModal("학습 파일을 불러오지 못했습니다."); showMenu(); }
}

window.startStudy = function () { 
    requestWakeLock(); 
    document.getElementById("start-btn").innerText = "Listen again";
    // [요청사항 2] 학습 시작 시 스킵 버튼 보이기
    const skipBtn = document.getElementById("skip-btn");
    if(skipBtn) skipBtn.style.display = "inline-block";
    playSentence(); 
};

// [요청사항 2] 스킵 기능
window.skipSentence = function() {
    try { recognizer.abort(); } catch(e) {}
    nextStep();
};

function playSentence() {
  const sText = document.getElementById("sentence");
  const item = currentData[index];
  
  sText.classList.remove("shake"); // 흔들림 초기화
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
  
  if (spoken.includes(target) || target.includes(spoken)) {
    successSound.play(); document.getElementById("sentence").style.color = "#39ff14";
    setTimeout(nextStep, 700);
  } else {
    failSound.play(); 
    sText.style.color = "#ff4b4b";
    sText.innerText = "Try again";
    // [요청사항 3] 흔들림 효과 (Shake) 복구
    sText.classList.remove("shake");
    void sText.offsetWidth; // 리플로우 강제
    sText.classList.add("shake");
    setTimeout(playSentence, 800);
  }
};

window.nextStep = function() {
  index++; if (index >= currentData.length) { index = 0; cycle++; }
  const percent = Math.floor((((cycle - 1) * currentData.length) + index) / (currentTotalCycles * currentData.length) * 100);
  sendDataToGoogle(currentPart, percent + "%"); // 저장
  if (percent >= 100 && !isAlertShown) { isAlertShown = true; triggerFireworkConfetti(); showCustomModal(`${currentPart} 100% 달성! 🎉`, () => playSentence()); return; }
  playSentence();
};

/* ======================================================
   6. AS Correction (피드백 및 저장)
   ====================================================== */
window.startASMode = async function() {
  currentPart = "AS Correction"; // [요청사항 2 해결] 파트명 명시
  const phone = document.getElementById("phone-input").value.trim();
  showBox('dev-box');
  const url = `${GOOGLE_SCRIPT_URL}?action=getAS&phone=${phone}&unit=Unit ${currentUnit}`;
  try {
    const res = await fetch(url); asData = await res.json();
    if (!asData || !asData.question) throw new Error();
    renderASPage(); showBox('as-box');
  } catch (e) {
    showCustomModal("등록된 첨삭 내용이 없습니다.", () => showMenu());
  }
};

function renderASPage() {
  const container = document.getElementById('as-box');
  const formatText = (text) => text ? String(text).replace(/\n/g, '<br>').replace(/\[(.*?)\]/g, '<span style="color:#ff4b4b; font-weight:bold;">$1</span>') : "";
  container.innerHTML = `
    <h2 style="margin-bottom:20px; color:#39ff14;">AS Correction</h2>
    <div style="text-align:left; margin-bottom:15px; border-bottom:1px solid #333; padding-bottom:10px;">
      <p style="color:#39ff14; font-size:12px; margin-bottom:5px;">[Question]</p>
      <p style="font-size:18px;">${formatText(asData.question)}</p>
    </div>
    <div style="text-align:left; background:#222; padding:15px; border-radius:12px; margin-bottom:10px;">
      <p style="color:#888; font-size:12px; margin-bottom:5px;">My Answer</p>
      <p style="color:#aaa; font-style:italic;">${formatText(asData.original)}</p>
    </div>
    <div style="text-align:left; background:#222; padding:15px; border-radius:12px; margin-bottom:20px;">
      <p style="color:#39ff14; font-size:12px; margin-bottom:5px;">Feedback</p>
      <p style="font-size:17px;">${formatText(asData.corrected)}</p>
    </div>
    <div id="as-timer" style="font-size:28px; margin-bottom:20px; color:#39ff14; font-weight:bold;">00:00</div>
    <button id="as-start-btn" onclick="startASStudy()">Start</button>
    <div id="as-controls" style="display:none; flex-direction:column; gap:10px; width:100%;">
      <button onclick="playASAudio()" style="background:#555; width:100%;">질문 다시듣기</button>
      <button onclick="finishASStudy()" style="background:#39ff14; color:#000; width:100%;">학습 완료</button>
    </div>
    <button onclick="showMenu()" class="sub-action-btn" style="width:65% !important; margin-top:15px;">Back</button>
  `;
}

window.startASStudy = function() {
  document.getElementById('as-start-btn').style.display = 'none';
  document.getElementById('as-controls').style.display = 'flex';
  asSeconds = 0;
  asTimer = setInterval(() => {
    asSeconds++;
    const m = Math.floor(asSeconds/60).toString().padStart(2,'0');
    const s = (asSeconds%60).toString().padStart(2,'0');
    document.getElementById('as-timer').innerText = `${m}:${s}`;
  }, 1000);
  playASAudio();
};

window.playASAudio = function() {
  player.src = BASE_URL + currentType + "u/" + asData.audio;
  player.play().catch(() => showCustomModal("음원 로드 실패"));
};

window.finishASStudy = function() {
  clearInterval(asTimer);
  const timeStr = Math.floor(asSeconds/60) + "분 " + (asSeconds%60) + "초";
  // [요청사항 2 해결] AS Correction 저장
  sendDataToGoogle("AS Correction", timeStr); 
  showCustomModal(`${userName}님, 학습이 완료되었습니다! ✔`, () => showMenu());
};

/* ======================================================
   7. Accurate Speaking (제출 관리)
   ====================================================== */
window.startAccurateSpeakingMode = async function() {
  const phone = document.getElementById("phone-input").value.trim();
  showBox('dev-box');
  try {
    const res = await fetch(`${GOOGLE_SCRIPT_URL}?action=getAS&phone=${phone}&unit=Unit ${currentUnit}`);
    asData = await res.json();
    
    const textInput = document.getElementById('student-text-input');
    if(textInput) textInput.value = "";

    if (asData && asData.isSubmitted) {
      document.getElementById('as-q-text').innerText = "이 유닛의 과제는 이미 정상적으로 전송되었습니다. ✔";
      showBox('as-record-box');
      document.getElementById('as-listen-btn').style.display = 'none';
      document.getElementById('recording-ui').style.display = 'none';
      document.getElementById('submit-ui').style.display = 'none';
      return;
    }

    document.getElementById('as-q-text').innerText = asData.question || "질문 정보가 없습니다.";
    showBox('as-record-box');
    document.getElementById('as-listen-btn').style.display = 'block';
    document.getElementById('recording-ui').style.display = 'none';
    document.getElementById('submit-ui').style.display = 'none';
  } catch (e) { showCustomModal("데이터 로드 실패"); showMenu(); }
};

window.listenQuestion = function() {
  if (!asData || !asData.audio) return showCustomModal("오디오 정보가 없습니다.");
  player.src = BASE_URL + currentType + "u/" + asData.audio;
  player.play().catch(() => showCustomModal("오디오 재생 실패"));
  player.onended = () => { startRecording(); }; 
};

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream); audioChunks = [];
    document.getElementById('as-listen-btn').style.display = 'none';
    document.getElementById('recording-ui').style.display = 'block';
    mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
    mediaRecorder.onstop = () => { processRecording(); };
    mediaRecorder.start();
    recSeconds = 0;
    recordingTimer = setInterval(() => { recSeconds++; document.getElementById('rec-timer').innerText = `00:${recSeconds.toString().padStart(2,'0')}`; if (recSeconds >= 60) stopRecording(); }, 1000);
  } catch (e) { showCustomModal("마이크 권한 필요"); }
}

window.stopRecording = function() { if (mediaRecorder && mediaRecorder.state !== "inactive") { mediaRecorder.stop(); clearInterval(recordingTimer); document.getElementById('recording-ui').style.display = 'none'; document.getElementById('submit-ui').style.display = 'block'; } };

async function processRecording() { const blob = new Blob(audioChunks, { type: 'audio/webm' }); const reader = new FileReader(); reader.readAsDataURL(blob); reader.onloadend = () => { window.lastAudioBase64 = reader.result.split(',')[1]; }; }

window.submitAccurateSpeaking = async function() {
  const text = document.getElementById('student-text-input').value.trim();
  if (!text) return showCustomModal("원문 내용을 입력해주세요.");
  showBox('dev-box');
  const payload = { action: "uploadAS", phone: document.getElementById("phone-input").value.trim(), unit: "Unit " + currentUnit, studentText: text, audioData: window.lastAudioBase64 };
  try {
    const res = await fetch(GOOGLE_SCRIPT_URL, { method: "POST", body: JSON.stringify(payload) });
    const data = await res.json();
    if (data.result === "success") {
      showCustomModal("성공적으로 제출되었습니다! 🎉\n선생님의 첨삭을 기다려주세요.", () => showMenu());
    } else { showCustomModal("제출 실패: " + data.message); showBox('as-record-box'); }
  } catch (e) { showCustomModal("서버 연결 실패"); showBox('as-record-box'); }
};

/* ======================================================
   8. 반복듣기 (UI 및 이어듣기 기능)
   ====================================================== */
window.startRepeatMode = async function() {
  try {
    const res = await fetch(BASE_URL + currentType + "u/" + `${currentType}u${currentUnit}.json`);
    currentData = await res.json();
    
    // 상태 초기화
    repeatIndex = 0;
    repeatCycleCount = 0;
    isRepeating = false;

    showBox('repeat-box');
    const container = document.getElementById('repeat-box');
    container.innerHTML = `
      <h2 style="color:#39ff14;">Listen & Repeat</h2>
      <div style="margin-bottom:15px; color:#fff;">
        반복 횟수: <input type="number" id="repeat-count" value="3" min="1" style="width:50px; background:#222; color:#39ff14; border:1px solid #333; border-radius:5px; text-align:center;"> 사이클
      </div>
      <div id="repeat-list" style="height:350px; overflow-y:auto; margin-bottom:20px; border:1px solid #333; padding:10px; border-radius:10px;"></div>
      <div style="display:flex; gap:10px; justify-content:center;">
        <button id="repeat-start-btn" onclick="runRepeatAudio()" style="background:#39ff14; color:#000; width:120px;">Start</button>
        <button onclick="stopRepeatAudio()" style="background:#ff4b4b; color:#fff; width:120px;">Stop</button>
      </div>
      <button onclick="showMenu()" class="sub-action-btn" style="margin-top:15px;">Back</button>
    `;
    const list = document.getElementById('repeat-list');
    currentData.forEach((item, idx) => {
      const div = document.createElement('div');
      div.className = 'repeat-item'; div.id = `repeat-${idx}`;
      div.style.padding = "10px"; div.style.borderBottom = "1px solid #222"; div.style.textAlign = "left";
      div.innerHTML = `<div style="color:#fff; font-size:15px;">${item.en}</div><div style="font-size:12px; color:#666;">${item.ko}</div>`;
      list.appendChild(div);
    });
  } catch (e) { showCustomModal("데이터 로드 실패"); }
};

// [요청사항 4] 반복듣기 이어듣기 로직
window.runRepeatAudio = async function() {
  const countInput = document.getElementById('repeat-count');
  const targetCycle = parseInt(countInput.value) || 3;
  const btn = document.getElementById('repeat-start-btn');
  
  if (isRepeating) return; // 중복 실행 방지
  
  isRepeating = true; 
  btn.disabled = true; 
  btn.innerText = "Playing...";

  // 멈춘 사이클(repeatCycleCount)과 멈춘 문장(repeatIndex)부터 시작
  for (let c = repeatCycleCount; c < targetCycle; c++) {
    repeatCycleCount = c; // 현재 사이클 저장
    
    for (let i = repeatIndex; i < currentData.length; i++) {
      if (!isRepeating) {
         repeatIndex = i; // 멈춘 위치 저장
         btn.disabled = false; 
         btn.innerText = "Start";
         return; 
      }
      
      await new Promise((resolve) => {
        document.querySelectorAll('.repeat-item').forEach(r => r.style.background = "transparent");
        const el = document.getElementById(`repeat-${i}`);
        if(el) { el.style.background = "#1a3a1a"; el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
        player.src = `${BASE_URL}${currentType}u/${currentData[i].audio}`; 
        player.play();
        player.onended = () => resolve();
      });
    }
    repeatIndex = 0; // 한 사이클 끝나면 문장 인덱스 초기화
  }
  
  // 종료 후 초기화
  isRepeating = false; 
  repeatCycleCount = 0;
  repeatIndex = 0;
  btn.disabled = false; 
  btn.innerText = "Start";
};

window.stopRepeatAudio = () => { 
    isRepeating = false; 
    player.pause(); 
};

// ----------------------
// 9. Progress Report (중복 제거)
// ----------------------
window.showResultsPage = async function() {
  const phone = document.getElementById("phone-input").value.trim(); showBox('dev-box');
  try {
    const res = await fetch(`${GOOGLE_SCRIPT_URL}?action=getResults&phone=${phone}`);
    const data = await res.json(); renderResultsCards(data); showBox('results-box');
  } catch (e) { showCustomModal("데이터 로드 실패"); }
};

function renderResultsCards(data) {
  const container = document.getElementById('results-content'); container.innerHTML = "";
  const uniqueParts = [];
  const filteredData = data.filter(row => { if (row.part && !uniqueParts.includes(row.part)) { uniqueParts.push(row.part); return true; } return false; });
  for (let u = 0; u < 8; u++) {
    const card = document.createElement('div'); card.style.cssText = "background:#222; border:1px solid #333; border-radius:15px; padding:15px; margin-bottom:15px; text-align:left;";
    let html = `<h3 style="color:#39ff14; border-bottom:1px solid #333; padding-bottom:5px;">Unit ${u+1}</h3>`;
    filteredData.forEach(row => {
      let val = row.units[u] || "-";
      if (!isNaN(val) && val !== "" && !val.toString().includes('분')) val = Math.round(parseFloat(val) * 100) + "%";
      html += `<div style="display:flex; justify-content:space-between; margin-top:5px; font-size:14px;"><span style="color:#aaa;">${row.part}</span><span style="color:${val==="100%"?"#39ff14":"#fff"}; font-weight:bold;">${val}</span></div>`;
    });
    card.innerHTML = html; container.appendChild(card);
  }
}

// ----------------------
// 10. 유틸리티 (Progress, 저장, 폭죽)
// ----------------------
function updateProgress() {
  const currentCount = ((cycle - 1) * currentData.length) + index;
  const percent = Math.floor((currentCount / (currentTotalCycles * currentData.length)) * 100);
  document.getElementById("progress-percent").innerText = percent + "%";
  document.getElementById("progress").style.width = Math.min(percent, 100) + "%";
}

function sendDataToGoogle(part, val) {
  const phone = document.getElementById("phone-input").value.trim();
  // Voca 및 AS Correction 저장 시 part 인자 전달 확인
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
