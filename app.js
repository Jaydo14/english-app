/* ======================================================
   1. 글로벌 설정 및 상태 관리 (Global Constants & State)
   ====================================================== */
const REPO_USER = "jaydo14"; 
const REPO_NAME = "english-app";
const BASE_URL = `https://raw.githubusercontent.com/${REPO_USER}/${REPO_NAME}/main/contents/`;

// ⭐ [필독] 구글 앱스 스크립트 '새 배포' 후 받은 최신 URL을 아래에 넣으세요.
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbydlQ44yzcz2vhySn1lpSqcJTDtKrDr7xIuHfWzyIMgxhrgRG7qYntgensiBCPxq0pz/exec"; 

let currentTotalCycles = 18; 
let currentPart = "Script"; 
let userName = ""; 
let currentType = ""; 
let currentUnit = 1;
let currentData = []; 
let index = 0;
let cycle = 1;
let isRepeating = false;
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

const player = new Audio();
const successSound = new Audio(BASE_URL + "common/success.mp3");
const failSound = new Audio(BASE_URL + "common/fail.mp3");

const bookDatabase = {
  "hc12": { 1: "Music", 2: "Directions", 3: "Favorite beverage", 4: "Movies", 5: "Lunch", 6: "Vacation", 7: "New years", 8: "Switch lives" },
  "fc21": { 1: "Restaurant", 2: "Birthday", 3: "Expenses", 4: "Dream job", 5: "Movies", 6: "Eating healthy", 7: "Traveling alone", 8: "Education" }
};

/* ======================================================
   2. 공통 UI 제어 (Common UI Controls)
   ====================================================== */
function showBox(boxId) {
  const boxes = [
    'login-box', 'unit-selector', 'menu-box', 'study-box', 
    'repeat-box', 'dev-box', 'as-box', 'results-box', 'as-record-box'
  ];
  boxes.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = (id === boxId) ? 'block' : 'none';
  });
  window.scrollTo(0, 0); // 화면 전환 시 맨 위로
}

function showCustomModal(msg, callback = null) {
  player.pause(); 
  const modal = document.getElementById('custom-modal');
  const msgEl = document.getElementById('modal-msg');
  if (modal && msgEl) {
    msgEl.innerText = msg;
    modal.style.display = 'flex';
    modalCallback = callback; 
  } else {
    alert(msg);
    if (callback) callback();
  }
}

window.closeCustomModal = function() {
  const modal = document.getElementById('custom-modal');
  if (modal) modal.style.display = 'none';
  if (modalCallback) {
    modalCallback();
    modalCallback = null;
  }
};

window.showMenu = function() { 
  stopRepeatAudio(); 
  if (asTimer) clearInterval(asTimer); 
  if (recordingTimer) clearInterval(recordingTimer);
  player.pause();
  showBox('menu-box'); 
};

window.goBackToUnits = function() {
  showBox('unit-selector');
};

/* ======================================================
   3. 로그인 및 유닛 선택 (Login & Unit Selection)
   ====================================================== */
window.login = function () {
  const phoneInput = document.getElementById("phone-input");
  const inputVal = phoneInput.value.trim();
  if (!inputVal) return showCustomModal("핸드폰 번호를 입력해주세요.");
  
  const loginBtn = document.querySelector("#login-box button");
  if (loginBtn) {
    loginBtn.disabled = true;
    loginBtn.innerText = "데이터 확인 중...";
  }

  fetch(`${GOOGLE_SCRIPT_URL}?phone=${inputVal}`)
    .then(res => res.json())
    .then(data => {
      if (data.result === "success") {
        userName = data.name; 
        currentType = data.type;
        renderUnitButtons();
        showBox('unit-selector');
        showCustomModal(`${userName}님, 반갑습니다! 🔥`);
      } else {
        showCustomModal("등록되지 않은 번호입니다. 관리자에게 문의하세요.");
        if (loginBtn) { loginBtn.disabled = false; loginBtn.innerText = "Login"; }
      }
    })
    .catch(err => {
      showCustomModal("접속 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
      if (loginBtn) { loginBtn.disabled = false; loginBtn.innerText = "Login"; }
    });
};

function renderUnitButtons() {
  const container = document.getElementById("unit-buttons");
  if (!container) return;
  container.innerHTML = ""; 
  const currentTitles = bookDatabase[currentType] || {};
  
  for (let i = 1; i <= 8; i++) {
    const btn = document.createElement("button");
    btn.className = "unit-btn";
    const title = currentTitles[i] ? `<br><span class="unit-title-sub">${currentTitles[i]}</span>` : "";
    btn.innerHTML = `Unit ${i}${title}`;
    btn.onclick = () => { currentUnit = i; showBox('menu-box'); };
    container.appendChild(btn);
  }
}

/* ======================================================
   4. 학습 엔진 (Script / Voca Study Engine)
   ====================================================== */
window.startScriptMode = function() { 
  currentPart = "Script"; 
  currentTotalCycles = 18; 
  loadStudyData(`${currentType}u${currentUnit}.json`); 
};

window.startVocaMode = function() { 
  currentPart = "Voca"; 
  currentTotalCycles = 10; 
  loadStudyData(`${currentType}u${currentUnit}_voca.json`); 
};

async function loadStudyData(fileName) {
  isAlertShown = false; 
  showBox('dev-box'); // 로딩 화면
  try {
    const res = await fetch(BASE_URL + currentType + "u/" + fileName);
    if (!res.ok) throw new Error();
    currentData = await res.json();
    index = 0; 
    cycle = 1;
    
    // 버튼 초기화
    const startBtn = document.getElementById("start-btn");
    if (startBtn) startBtn.innerText = "Start";
    const skipBtn = document.getElementById("skip-btn");
    if (skipBtn) skipBtn.style.display = "none";
    
    updateProgress(); 
    showBox('study-box');
  } catch (e) {
    showCustomModal("학습 데이터를 불러오지 못했습니다.");
    showMenu();
  }
}

window.startStudy = function() {
  const startBtn = document.getElementById("start-btn");
  if (startBtn) startBtn.innerText = "Listen again";
  const skipBtn = document.getElementById("skip-btn");
  if (skipBtn) skipBtn.style.display = "inline-block"; // 스킵 버튼 등장
  
  playSentence();
};

function playSentence() {
  const sText = document.getElementById("sentence");
  if (!sText) return;
  
  const item = currentData[index];
  sText.classList.remove("shake"); // 이전 흔들림 초기화
  sText.innerText = item.en; 
  sText.style.color = "#fff";
  
  document.getElementById("sentence-kor").innerText = item.ko;
  updateProgress();
  
  player.src = BASE_URL + currentType + "u/" + item.audio;
  player.play();
  player.onended = () => {
    sText.style.color = "#ffff00"; // 인식 대기 색상
    startRecognition();
  };
}

// [무삭제 스킵 기능]
window.skipSentence = function() {
  stopRecognition();
  nextStep();
};

/* ======================================================
   5. 음성 인식 및 시각 효과 (Speech Recognition & Visuals)
   ====================================================== */
window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognizer = new SpeechRecognition();
recognizer.lang = "en-US";
recognizer.interimResults = false;

function startRecognition() { try { recognizer.start(); } catch(e) {} }
function stopRecognition() { try { recognizer.abort(); } catch(e) {} }

recognizer.onresult = (event) => {
  const spoken = event.results[0][0].transcript.toLowerCase();
  const target = currentData[index].en.toLowerCase().replace(/[.,?!'"]/g, "");
  const sText = document.getElementById("sentence");

  if (spoken.includes(target) || target.includes(spoken)) {
    // 성공 효과
    successSound.play();
    sText.innerText = "Excellent!"; 
    sText.style.color = "#39ff14";
    setTimeout(nextStep, 700);
  } else {
    // 실패 효과 (흔들림 포함)
    failSound.play();
    sText.innerText = "Try again"; 
    sText.style.color = "#ff4b4b";
    
    sText.classList.remove("shake"); 
    void sText.offsetWidth; // 리플로우 강제 트리거
    sText.classList.add("shake"); 
    
    setTimeout(playSentence, 800);
  }
};

window.nextStep = function() {
  index++; 
  if (index >= currentData.length) { 
    index = 0; 
    cycle++; 
  }
  
  const currentCount = ((cycle - 1) * currentData.length) + index;
  const totalNeed = currentTotalCycles * currentData.length;
  const percent = Math.floor((currentCount / totalNeed) * 100);
  
  // 구글 시트 저장 (메모/시간 포함)
  sendDataToGoogle(currentPart, percent + "%");
  
  if (percent >= 100 && !isAlertShown) { 
    isAlertShown = true; 
    triggerFireworkConfetti(); 
    showCustomModal(`🎉 축하합니다! ${currentPart} 학습을 100% 완료했습니다!`, () => playSentence()); 
    return; 
  }
  playSentence();
};

/* ======================================================
   6. AS Correction (피드백 확인 및 학습)
   ====================================================== */
window.startASMode = async function() {
  currentPart = "AS Correction";
  const phone = document.getElementById("phone-input").value.trim();
  showBox('dev-box');
  
  try {
    const res = await fetch(`${GOOGLE_SCRIPT_URL}?action=getAS&phone=${phone}&unit=Unit ${currentUnit}`);
    asData = await res.json();
    if (!asData || !asData.question) throw new Error();
    
    renderASPage(); 
    showBox('as-box');
  } catch (e) {
    showCustomModal("등록된 선생님의 첨삭 데이터가 아직 없습니다.", () => showMenu());
  }
};

function renderASPage() {
  const container = document.getElementById('as-box');
  const formatText = (text) => {
    if (!text) return "";
    return String(text)
      .replace(/\n/g, '<br>')
      .replace(/\[(.*?)\]/g, '<span style="color:#ff4b4b; font-weight:bold;">$1</span>'); // 교정 포인트 강조
  };

  container.innerHTML = `
    <h2 class="as-title">AS Correction</h2>
    <div class="as-section">
      <p class="as-label">[Teacher's Question]</p>
      <p class="as-q-text">${formatText(asData.question)}</p>
    </div>
    <div class="as-card my-answer">
      <p class="as-label">My Original Answer</p>
      <p class="as-ans-text">${formatText(asData.original)}</p>
    </div>
    <div class="as-card teacher-feedback">
      <p class="as-label">Teacher's Feedback</p>
      <p class="as-fb-text">${formatText(asData.corrected)}</p>
    </div>
    <div id="as-timer" class="as-timer-display">00:00</div>
    <div class="as-btns">
      <button id="as-start-btn" onclick="startASStudy()" class="primary-btn">Start Review</button>
      <div id="as-controls" style="display:none; flex-direction:column; gap:10px; width:100%;">
        <button onclick="playASAudio()" class="secondary-btn">Listen Question</button>
        <button onclick="finishASStudy()" class="success-btn">Finish Study</button>
      </div>
      <button onclick="showMenu()" class="back-btn">Back to Menu</button>
    </div>
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

window.playASAudio = () => { 
  player.src = BASE_URL + currentType + "u/" + asData.audio; 
  player.play(); 
};

window.finishASStudy = function() {
  clearInterval(asTimer);
  const timeResult = Math.floor(asSeconds/60) + "분 " + (asSeconds%60) + "초";
  sendDataToGoogle("AS Correction", timeResult); // 학습 시간 기록
  showCustomModal(`고생하셨습니다! ${userName}님, 오늘의 첨삭 학습을 마쳤습니다. ✔`, () => showMenu());
};

/* ======================================================
   7. Accurate Speaking (녹음 및 과제 제출)
   ====================================================== */
window.startAccurateSpeakingMode = async function() {
  const phone = document.getElementById("phone-input").value.trim();
  showBox('dev-box');
  try {
    const res = await fetch(`${GOOGLE_SCRIPT_URL}?action=getAS&phone=${phone}&unit=Unit ${currentUnit}`);
    asData = await res.json();
    
    // [무삭제 초기화 로직] 유닛 변경 시 이전 텍스트 삭제
    document.getElementById('student-text-input').value = "";
    
    if (asData && asData.isSubmitted) {
      document.getElementById('as-q-text').innerText = "이미 제출된 과제입니다. 선생님의 첨삭을 기다려주세요! ✔";
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
  } catch (e) {
    showCustomModal("서버 연결 실패. 나중에 다시 시도하세요.");
    showMenu();
  }
};

window.listenQuestion = function() {
  player.src = BASE_URL + currentType + "u/" + asData.audio;
  player.play();
  player.onended = () => { startRecording(); }; 
};

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
    recordingTimer = setInterval(() => {
      recSeconds++;
      document.getElementById('rec-timer').innerText = `00:${recSeconds.toString().padStart(2,'0')}`;
      if (recSeconds >= 60) stopRecording();
    }, 1000);
  } catch (e) {
    showCustomModal("마이크 사용 권한이 거부되었습니다.");
  }
}

window.stopRecording = function() { 
  if (mediaRecorder && mediaRecorder.state !== "inactive") { 
    mediaRecorder.stop(); 
    clearInterval(recordingTimer); 
    document.getElementById('recording-ui').style.display = 'none'; 
    document.getElementById('submit-ui').style.display = 'block'; 
  } 
};

async function processRecording() {
  const blob = new Blob(audioChunks, { type: 'audio/webm' });
  const reader = new FileReader();
  reader.readAsDataURL(blob);
  reader.onloadend = () => {
    window.lastAudioBase64 = reader.result.split(',')[1]; // 순수 Base64 추출
  };
}

window.submitAccurateSpeaking = async function() {
  const text = document.getElementById('student-text-input').value.trim();
  if (!text) return showCustomModal("답변 내용을 입력해주세요.");
  
  showBox('dev-box');
  const payload = { 
    action: "uploadAS", 
    phone: document.getElementById("phone-input").value.trim(), 
    unit: "Unit " + currentUnit, 
    studentText: text, 
    audioData: window.lastAudioBase64 
  };
  
  try {
    const res = await fetch(GOOGLE_SCRIPT_URL, { method: "POST", body: JSON.stringify(payload) });
    const data = await res.json();
    if (data.result === "success") {
      showCustomModal("성공적으로 제출되었습니다! 🎉", () => showMenu()); // AS 제출 시 폭죽 제거
    } else {
      throw new Error(data.message);
    }
  } catch (e) {
    showCustomModal("전송 실패: 서버 설정을 다시 확인해주세요.");
    showBox('as-record-box');
  }
};

/* ======================================================
   8. Listen & Repeat (사이클 제어 및 스크롤)
   ====================================================== */
window.startRepeatMode = async function() {
  try {
    const res = await fetch(`${BASE_URL}${currentType}u/${currentType}u${currentUnit}.json`);
    currentData = await res.json();
    showBox('repeat-box');
    
    const container = document.getElementById('repeat-box');
    container.innerHTML = `
      <h2 style="color:#39ff14; margin-bottom:20px;">Listen & Repeat</h2>
      <div class="repeat-config">
        반복 횟수 설정: <input type="number" id="repeat-count" value="3" min="1" class="repeat-input"> 사이클
      </div>
      <div id="repeat-list" class="repeat-scroll-area"></div>
      <div class="repeat-btns">
        <button id="repeat-start-btn" onclick="runRepeatAudio()" class="start-btn">Start</button>
        <button onclick="stopRepeatAudio()" class="stop-btn">Stop</button>
      </div>
      <button onclick="showMenu()" class="back-btn">Back to Menu</button>
    `;
    
    const list = document.getElementById('repeat-list');
    currentData.forEach((item, idx) => {
      const div = document.createElement('div');
      div.className = 'repeat-item'; 
      div.id = `repeat-${idx}`;
      div.innerHTML = `<div class="en">${item.en}</div><div class="ko">${item.ko}</div>`;
      list.appendChild(div);
    });
  } catch (e) {
    showCustomModal("데이터를 불러올 수 없습니다.");
  }
};

window.runRepeatAudio = async function() {
  const count = parseInt(document.getElementById('repeat-count').value) || 3;
  const btn = document.getElementById('repeat-start-btn');
  isRepeating = true; 
  btn.disabled = true; 
  btn.innerText = "Playing...";
  
  for (let c = 0; c < count; c++) {
    for (let i = 0; i < currentData.length; i++) {
      if (!isRepeating) return; // 중단 시 즉시 종료
      
      await new Promise((resolve) => {
        // 하이라이트 효과
        document.querySelectorAll('.repeat-item').forEach(r => r.classList.remove('active'));
        const el = document.getElementById(`repeat-${i}`);
        if (el) { 
          el.classList.add('active'); 
          el.scrollIntoView({ behavior: 'smooth', block: 'center' }); 
        }
        
        player.src = `${BASE_URL}${currentType}u/${currentData[i].audio}`; 
        player.play();
        player.onended = () => resolve();
      });
    }
  }
  isRepeating = false; 
  btn.disabled = false; 
  btn.innerText = "Start";
};

window.stopRepeatAudio = () => { 
  isRepeating = false; 
  player.pause(); 
  const btn = document.getElementById('repeat-start-btn');
  if (btn) { btn.disabled = false; btn.innerText = "Start"; }
};

/* ======================================================
   9. 학습 결과 리포트 (Results Report)
   ====================================================== */
window.showResultsPage = async function() {
  const phone = document.getElementById("phone-input").value.trim();
  showBox('dev-box');
  try {
    const res = await fetch(`${GOOGLE_SCRIPT_URL}?action=getResults&phone=${phone}`);
    const data = await res.json();
    renderResultsCards(data);
    showBox('results-box');
  } catch (e) {
    showCustomModal("리포트를 가져오지 못했습니다.");
  }
};

function renderResultsCards(data) {
  const container = document.getElementById('results-content');
  container.innerHTML = "";
  
  // [무삭제 중복 제거 로직] 파트 이름 기준
  const uniqueParts = [];
  const filteredData = data.filter(row => {
    if (row.part && !uniqueParts.includes(row.part)) {
      uniqueParts.push(row.part);
      return true;
    }
    return false;
  });

  for (let u = 0; u < 8; u++) {
    const card = document.createElement('div');
    card.className = "result-card";
    let html = `<h3 class="unit-header">Unit ${u+1}</h3>`;
    
    filteredData.forEach(row => {
      let val = row.units[u] || "-";
      if (!isNaN(val) && val !== "" && !val.toString().includes('분')) {
        val = Math.round(parseFloat(val) * 100) + "%";
      }
      const isComplete = val === "100%";
      html += `
        <div class="result-row">
          <span class="part-name">${row.part}</span>
          <span class="part-val" style="color:${isComplete ? '#39ff14' : '#fff'};">${val}</span>
        </div>`;
    });
    card.innerHTML = html;
    container.appendChild(card);
  }
}

/* ======================================================
   10. 유틸리티 (Progress, Save, Fireworks)
   ====================================================== */
function updateProgress() {
  const currentCount = ((cycle - 1) * currentData.length) + index;
  const totalNeed = currentTotalCycles * currentData.length;
  const percent = Math.floor((currentCount / totalNeed) * 100);
  
  const pText = document.getElementById("progress-percent");
  if (pText) pText.innerText = percent + "%";
  
  const pBar = document.getElementById("progress");
  if (pBar) pBar.style.width = Math.min(percent, 100) + "%";
}

function sendDataToGoogle(part, val) {
  const phone = document.getElementById("phone-input").value.trim();
  const payload = { 
    action: "save", 
    phone: phone, 
    unit: "Unit " + currentUnit, 
    percent: val, 
    part: part 
  };
  // CORS 정책 우회를 위해 no-cors 사용 (반환값 확인 불필요 시)
  fetch(GOOGLE_SCRIPT_URL, { 
    method: "POST", 
    mode: "no-cors", 
    body: JSON.stringify(payload) 
  });
}

function triggerFireworkConfetti() {
  const duration = 4 * 1000;
  const animationEnd = Date.now() + duration;
  const interval = setInterval(function() {
    const timeLeft = animationEnd - Date.now();
    if (timeLeft <= 0) return clearInterval(interval);
    
    confetti({ 
      particleCount: 50, 
      startVelocity: 30, 
      spread: 360, 
      origin: { x: Math.random(), y: Math.random() - 0.2 } 
    });
  }, 250);
}
