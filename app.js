/* ======================================================
   1. 글로벌 변수 및 데이터베이스
   ====================================================== */
const REPO_USER = "jaydo14"; 
const REPO_NAME = "english-app";
const BASE_URL = `https://raw.githubusercontent.com/${REPO_USER}/${REPO_NAME}/main/contents/`;
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzEOkMWYDbkR3qmakJUJ5SMO0AXxc1H5AUbUyxECQrIGG-ulnpHzPASzC7LSba3e_14/exec"; 

let currentTotalCycles = 18; let currentPart = "Script"; let userName = ""; 
let currentType = ""; let currentUnit = 1; let currentData = []; let index = 0; let cycle = 1;
let isRepeating = false; let repeatIndex = 0; let repeatCycleCount = 0; // 반복듣기 이어듣기 전용

const player = new Audio();
let asTimer = null; let asSeconds = 0; let asData = null; let isAlertShown = false; 
let mediaRecorder; let audioChunks = []; let recordingTimer; let recSeconds = 0; let modalCallback = null; 

const successSound = new Audio(BASE_URL + "common/success.mp3");
const failSound = new Audio(BASE_URL + "common/fail.mp3");

const bookDatabase = {
  "hc12": { 1: "Music", 2: "Directions", 3: "Favorite beverage", 4: "Movies", 5: "Lunch", 6: "Vacation", 7: "New years", 8: "Switch lives" },
  "fc21": { 1: "Restaurant", 2: "Birthday", 3: "Expenses", 4: "Dream job", 5: "Movies", 6: "Eating healthy", 7: "Traveling alone", 8: "Education" }
};

/* ======================================================
   2. UI 관리 및 유틸리티
   ====================================================== */
function showBox(boxId) {
  const boxes = ['login-box', 'unit-selector', 'menu-box', 'study-box', 'repeat-box', 'dev-box', 'as-box', 'results-box', 'as-record-box'];
  boxes.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = (id === boxId) ? 'block' : 'none';
  });
  document.getElementById("app").style.display = "block";
  window.scrollTo(0, 0); 
}

function showCustomModal(msg, callback = null) {
  player.pause(); 
  const modal = document.getElementById('custom-modal');
  if (modal) {
    document.getElementById('modal-msg').innerText = msg;
    modal.style.display = 'flex';
    modalCallback = callback; 
  } else { alert(msg); if(callback) callback(); }
}

window.closeCustomModal = () => {
  document.getElementById('custom-modal').style.display = 'none';
  if (modalCallback) { modalCallback(); modalCallback = null; }
};

// [복구] 뒤로가기 버튼 기능들
window.goBackToUnits = () => showBox('unit-selector');
window.showMenu = () => { stopRepeatAudio(); if (asTimer) clearInterval(asTimer); showBox('menu-box'); };

/* ======================================================
   3. 로그인 및 유닛 설정
   ====================================================== */
window.login = function () {
  const phoneInput = document.getElementById("phone-input");
  const inputVal = phoneInput.value.trim();
  if (inputVal.length < 1) return showCustomModal("번호를 입력하세요.");
  
  const loginBtn = document.querySelector("#login-box button");
  if(loginBtn) { loginBtn.disabled = true; loginBtn.innerText = "Checking..."; }

  fetch(`${GOOGLE_SCRIPT_URL}?phone=${inputVal}`)
    .then(res => res.json())
    .then(data => {
      if (data.result === "success") {
        userName = data.name; currentType = data.type;
        renderUnitButtons();
        showBox('unit-selector');
        showCustomModal(`${userName}님 환영합니다!`);
      } else {
        showCustomModal("등록되지 않은 번호입니다.");
        if(loginBtn) { loginBtn.disabled = false; loginBtn.innerText = "Login"; }
      }
    }).catch(() => {
      showCustomModal("서버 연결 실패");
      if(loginBtn) { loginBtn.disabled = false; loginBtn.innerText = "Login"; }
    });
};

function renderUnitButtons() {
  const container = document.getElementById("unit-buttons");
  if(!container) return;
  container.innerHTML = ""; 
  const currentTitles = bookDatabase[currentType] || {};
  for (let i = 1; i <= 8; i++) {
    const btn = document.createElement("button");
    const title = currentTitles[i] ? `<br><span style="font-size:11px; color:#000;">${currentTitles[i]}</span>` : "";
    btn.innerHTML = `Unit ${i}${title}`;
    btn.onclick = () => { currentUnit = i; showBox('menu-box'); };
    container.appendChild(btn);
  }
}

/* ======================================================
   4. 학습 엔진 (Skip, Shake, 50% Match 로직)
   ====================================================== */
window.startScriptMode = () => { currentPart = "Script"; currentTotalCycles = 18; loadStudyData(`${currentType}u${currentUnit}.json`); };
window.startVocaMode = () => { currentPart = "Voca"; currentTotalCycles = 10; loadStudyData(`${currentType}u${currentUnit}_voca.json`); };

async function loadStudyData(fileName) {
  isAlertShown = false; 
  try {
    const res = await fetch(BASE_URL + currentType + "u/" + fileName);
    currentData = await res.json(); index = 0; cycle = 1;
    document.getElementById("start-btn").innerText = "Start";
    document.getElementById("skip-btn").style.display = "none";
    updateProgress(); showBox('study-box');
  } catch (e) { showCustomModal("데이터 로드 실패"); }
}

window.startStudy = function() {
  document.getElementById("start-btn").innerText = "Listen again";
  document.getElementById("skip-btn").style.display = "inline-block"; // [복구] 스킵 버튼 활성화
  playSentence();
};

window.skipSentence = () => { try { recognizer.abort(); } catch(e) {} nextStep(); };

function playSentence() {
  const sText = document.getElementById("sentence");
  if(!sText) return;
  const item = currentData[index];
  sText.classList.remove("shake"); // 흔들림 초기화
  sText.innerText = item.en; sText.style.color = "#fff";
  document.getElementById("sentence-kor").innerText = item.ko;
  updateProgress();
  player.src = BASE_URL + currentType + "u/" + item.audio;
  player.play();
  player.onended = () => { sText.style.color = "#ffff00"; startRecognition(); };
}

window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognizer = new SpeechRecognition();
recognizer.lang = "en-US";
recognizer.onresult = (event) => {
  const spoken = event.results[0][0].transcript.toLowerCase();
  const target = currentData[index].en.toLowerCase().replace(/[.,?!'"]/g, "");
  const sText = document.getElementById("sentence");

  // [핵심 추가] 50% 이상 일치 시 통과하는 엔진
  const isPass = checkSimilarity(spoken, target) >= 0.5;

  if (isPass) {
    successSound.play(); sText.innerText = "Excellent!"; sText.style.color = "#39ff14";
    setTimeout(nextStep, 700);
  } else {
    failSound.play(); sText.innerText = "Try again"; sText.style.color = "#ff4b4b";
    // [복구] 흔들림 효과 애니메이션
    sText.classList.remove("shake"); void sText.offsetWidth; sText.classList.add("shake");
    setTimeout(playSentence, 800);
  }
};

function checkSimilarity(spoken, target) {
  const spokenWords = spoken.split(' ');
  const targetWords = target.split(' ');
  let matchCount = 0;
  targetWords.forEach(word => { if (spoken.includes(word)) matchCount++; });
  return matchCount / targetWords.length; // 일치율 반환
}

function startRecognition() { try { recognizer.start(); } catch(e) {} }

window.nextStep = function() {
  index++; if (index >= currentData.length) { index = 0; cycle++; }
  const percent = Math.floor((((cycle - 1) * currentData.length) + index) / (currentTotalCycles * currentData.length) * 100);
  sendDataToGoogle(currentPart, percent + "%"); // 저장 및 시간 메모
  if (percent >= 100 && !isAlertShown) { 
    isAlertShown = true; triggerFireworkConfetti(); 
    showCustomModal(`${currentPart} 100% 달성!`, () => playSentence()); return; 
  }
  playSentence();
};

/* ======================================================
   5. AS & Accurate Speaking 로직 (중복 제출 방지 포함)
   ====================================================== */
window.startASMode = async function() {
  currentPart = "AS Correction"; const phone = document.getElementById("phone-input").value.trim(); showBox('dev-box');
  try {
    const res = await fetch(`${GOOGLE_SCRIPT_URL}?action=getAS&phone=${phone}&unit=Unit ${currentUnit}`);
    asData = await res.json(); renderASPage(); showBox('as-box');
  } catch (e) { showCustomModal("데이터 없음", () => showMenu()); }
};

function renderASPage() {
  const container = document.getElementById('as-box');
  const format = (t) => t ? String(t).replace(/\n/g, '<br>').replace(/\[(.*?)\]/g, '<span style="color:#ff4b4b; font-weight:bold;">$1</span>') : "";
  container.innerHTML = `
    <h2 style="color:#39ff14;">AS Correction</h2>
    <div style="text-align:left; border-bottom:1px solid #333; padding-bottom:10px; margin-bottom:15px;"><p style="color:#39ff14; font-size:12px;">[Question]</p><p style="font-size:18px;">${format(asData.question)}</p></div>
    <div style="text-align:left; background:#222; padding:15px; border-radius:12px; margin-bottom:10px;"><p style="color:#888; font-size:12px;">My Answer</p><p style="color:#aaa;">${format(asData.original)}</p></div>
    <div style="text-align:left; background:#222; padding:15px; border-radius:12px; margin-bottom:20px;"><p style="color:#39ff14; font-size:12px;">Feedback</p><p style="font-size:17px;">${format(asData.corrected)}</p></div>
    <div id="as-timer" style="font-size:28px; margin-bottom:20px; color:#39ff14; font-weight:bold;">00:00</div>
    <button id="as-start-btn" onclick="startASStudy()">Start</button>
    <div id="as-controls" style="display:none; flex-direction:column; gap:10px;"><button onclick="playASAudio()" style="background:#555;">질문 다시듣기</button><button onclick="finishASStudy()" style="background:#39ff14; color:#000;">학습 완료</button></div>
    <button onclick="showMenu()" class="sub-action-btn" style="margin-top:15px;">Back</button>`;
}

window.startASStudy = function() {
  document.getElementById('as-start-btn').style.display = 'none'; document.getElementById('as-controls').style.display = 'flex';
  asSeconds = 0; asTimer = setInterval(() => { asSeconds++; const m = Math.floor(asSeconds/60).toString().padStart(2,'0'); const s = (asSeconds%60).toString().padStart(2,'0'); document.getElementById('as-timer').innerText = `${m}:${s}`; }, 1000);
  player.src = BASE_URL + currentType + "u/" + asData.audio; player.play();
};

window.finishASStudy = function() {
  clearInterval(asTimer); sendDataToGoogle("AS Correction", Math.floor(asSeconds/60) + "분 " + (asSeconds%60) + "초");
  showCustomModal(`학습 완료! ✔`, () => showMenu());
};

window.startAccurateSpeakingMode = async function() {
  const phone = document.getElementById("phone-input").value.trim(); showBox('dev-box');
  try {
    const res = await fetch(`${GOOGLE_SCRIPT_URL}?action=getAS&phone=${phone}&unit=Unit ${currentUnit}`);
    asData = await res.json();
    document.getElementById('student-text-input').value = "";
    if (asData && asData.isSubmitted) { // [복구] 중복 제출 방지 문구
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

/* ======================================================
   6. 반복듣기 (Stop 후 이어서 재생하는 로직)
   ====================================================== */
window.startRepeatMode = async function() {
  try {
    const res = await fetch(`${BASE_URL}${currentType}u/${currentType}u${currentUnit}.json`);
    currentData = await res.json(); repeatIndex = 0; repeatCycleCount = 0; isRepeating = false;
    showBox('repeat-box');
    const container = document.getElementById('repeat-list');
    container.innerHTML = "";
    currentData.forEach((item, idx) => {
      const div = document.createElement('div'); div.id = `repeat-${idx}`; div.className = 'repeat-item';
      div.style.padding = "10px; border-bottom:1px solid #222; text-align:left;";
      div.innerHTML = `<div style="color:#fff;">${item.en}</div><div style="color:#666; font-size:12px;">${item.ko}</div>`;
      container.appendChild(div);
    });
  } catch (e) { showCustomModal("로드 실패"); }
};

window.runRepeatAudio = async function() {
  const count = parseInt(document.getElementById('repeat-count').value) || 3;
  const btn = document.getElementById('repeat-start-btn');
  if (isRepeating) return; isRepeating = true; btn.disabled = true; btn.innerText = "Playing...";
  // [해결] 멈췄던 지점(repeatCycleCount, repeatIndex)부터 다시 루프 시작
  for (let c = repeatCycleCount; c < count; c++) {
    repeatCycleCount = c;
    let sIdx = (c === repeatCycleCount) ? repeatIndex : 0; 
    for (let i = sIdx; i < currentData.length; i++) {
      if (!isRepeating) { repeatIndex = i; return; } 
      await new Promise(resolve => {
        document.querySelectorAll('.repeat-item').forEach(r => r.style.background = "transparent");
        const el = document.getElementById(`repeat-${i}`);
        if(el) { el.style.background = "#1a3a1a"; el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
        player.src = `${BASE_URL}${currentType}u/${currentData[i].audio}`; player.play();
        player.onended = resolve;
      });
    }
    repeatIndex = 0;
  }
  isRepeating = false; btn.disabled = false; btn.innerText = "Start"; repeatIndex = 0; repeatCycleCount = 0;
};
window.stopRepeatAudio = () => { isRepeating = false; player.pause(); document.getElementById('repeat-start-btn').disabled = false; document.getElementById('repeat-start-btn').innerText = "Start"; };

/* ======================================================
   7. 유틸리티 (Progress, 저장, Confetti)
   ====================================================== */
function updateProgress() {
  const currentCount = ((cycle - 1) * currentData.length) + index;
  const percent = Math.floor((currentCount / (currentTotalCycles * currentData.length)) * 100);
  const pText = document.getElementById("progress-percent"); if(pText) pText.innerText = percent + "%";
  const pBar = document.getElementById("progress"); if(pBar) pBar.style.width = Math.min(percent, 100) + "%";
}

function sendDataToGoogle(part, val) {
  const phone = document.getElementById("phone-input").value.trim();
  fetch(GOOGLE_SCRIPT_URL, { method: "POST", mode: "no-cors", body: JSON.stringify({ action: "save", phone, unit: "Unit " + currentUnit, percent: val, part }) });
}

function triggerFireworkConfetti() {
  const duration = 3000; const end = Date.now() + duration;
  (function frame() {
    confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 } });
    confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 } });
    if (Date.now() < end) requestAnimationFrame(frame);
  }());
}
