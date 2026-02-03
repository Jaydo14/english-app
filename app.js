/* ======================================================
   1. 글로벌 설정 (Global Configuration)
   ====================================================== */
const REPO_USER = "jaydo14"; 
const REPO_NAME = "english-app";
const BASE_URL = `https://raw.githubusercontent.com/${REPO_USER}/${REPO_NAME}/main/contents/`;
// ⭐ 반드시 '새 배포' 후 받은 최신 URL로 업데이트하세요!
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

// 교재 데이터베이스 (ID 일치 확인 필수)
const bookDatabase = {
  "hc12": { 1: "Music", 2: "Directions", 3: "Favorite beverage", 4: "Movies", 5: "Lunch", 6: "Vacation", 7: "New years", 8: "Switch lives" },
  "fc21": { 1: "Restaurant", 2: "Birthday", 3: "Expenses", 4: "Dream job", 5: "Movies", 6: "Eating healthy", 7: "Traveling alone", 8: "Education" }
};

/* ======================================================
   2. UI 제어 및 화면 전환 (UI Management)
   ====================================================== */
function showBox(boxId) {
  const boxes = ['login-box', 'unit-selector', 'menu-box', 'study-box', 'repeat-box', 'dev-box', 'as-box', 'results-box', 'as-record-box'];
  boxes.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = (id === boxId) ? 'block' : 'none';
  });
  window.scrollTo(0, 0); 
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
  if (modalCallback) { modalCallback(); modalCallback = null; }
};

window.showMenu = function() { 
  stopRepeatAudio(); 
  if (asTimer) clearInterval(asTimer); 
  if (recordingTimer) clearInterval(recordingTimer);
  player.pause();
  showBox('menu-box'); 
};

window.goBackToUnits = function() { showBox('unit-selector'); };

/* ======================================================
   3. 로그인 및 유닛 버튼 생성 (Login & Units)
   ====================================================== */
window.login = function () {
  const phoneInput = document.getElementById("phone-input");
  const inputVal = phoneInput.value.trim();
  if (!inputVal) return showCustomModal("핸드폰 번호를 입력해주세요.");
  
  const loginBtn = document.querySelector("#login-box button");
  if (loginBtn) { loginBtn.disabled = true; loginBtn.innerText = "데이터 확인 중..."; }

  fetch(`${GOOGLE_SCRIPT_URL}?phone=${inputVal}`)
    .then(res => res.json())
    .then(data => {
      if (data.result === "success") {
        userName = data.name; 
        // 시트의 교재코드를 소문자로 변환하여 저장
        currentType = String(data.type).toLowerCase().trim();
        
        // 버튼 생성이 성공해야 화면을 넘김
        if (renderUnitButtons()) {
          showBox('unit-selector');
          showCustomModal(`${userName}님, 반갑습니다! 🔥`);
        } else {
          showCustomModal("교재 정보를 찾을 수 없습니다. (코드: " + currentType + ")");
          if (loginBtn) { loginBtn.disabled = false; loginBtn.innerText = "Login"; }
        }
      } else {
        showCustomModal("등록되지 않은 번호입니다.");
        if (loginBtn) { loginBtn.disabled = false; loginBtn.innerText = "Login"; }
      }
    })
    .catch(err => {
      showCustomModal("접속 오류가 발생했습니다. (GAS 설정을 확인하세요)");
      if (loginBtn) { loginBtn.disabled = false; loginBtn.innerText = "Login"; }
    });
};

function renderUnitButtons() {
  const container = document.getElementById("unit-buttons");
  if (!container) return false;
  
  container.innerHTML = ""; 
  const currentTitles = bookDatabase[currentType];
  
  // 데이터베이스에 교재코드가 없으면 실패 반환
  if (!currentTitles) return false;

  for (let i = 1; i <= 8; i++) {
    const btn = document.createElement("button");
    btn.className = "unit-btn";
    const title = currentTitles[i] ? `<br><span style="font-size:11px; font-weight:normal; color:#ddd;">${currentTitles[i]}</span>` : "";
    btn.innerHTML = `Unit ${i}${title}`;
    btn.onclick = () => { currentUnit = i; showBox('menu-box'); };
    container.appendChild(btn);
  }
  return true;
}

/* ======================================================
   4. 학습 엔진 (Script / Voca / 흔들림 / 스킵)
   ====================================================== */
window.startScriptMode = function() { currentPart = "Script"; currentTotalCycles = 18; loadStudyData(`${currentType}u${currentUnit}.json`); };
window.startVocaMode = function() { currentPart = "Voca"; currentTotalCycles = 10; loadStudyData(`${currentType}u${currentUnit}_voca.json`); };

async function loadStudyData(fileName) {
  isAlertShown = false; showBox('dev-box');
  try {
    const res = await fetch(BASE_URL + currentType + "u/" + fileName);
    if (!res.ok) throw new Error();
    currentData = await res.json();
    index = 0; cycle = 1;
    document.getElementById("start-btn").innerText = "Start";
    document.getElementById("skip-btn").style.display = "none";
    updateProgress(); 
    showBox('study-box');
  } catch (e) { showCustomModal("학습 데이터를 불러오지 못했습니다."); showMenu(); }
}

window.startStudy = function() {
  document.getElementById("start-btn").innerText = "Listen again";
  document.getElementById("skip-btn").style.display = "inline-block"; // 스킵 버튼 복구
  playSentence();
};

function playSentence() {
  const sText = document.getElementById("sentence");
  if (!sText) return;
  const item = currentData[index];
  sText.classList.remove("shake"); // 흔들림 초기화
  sText.innerText = item.en; sText.style.color = "#fff";
  document.getElementById("sentence-kor").innerText = item.ko;
  updateProgress();
  player.src = BASE_URL + currentType + "u/" + item.audio;
  player.play();
  player.onended = () => { sText.style.color = "#ffff00"; startRecognition(); };
}

window.skipSentence = function() { stopRecognition(); nextStep(); };

// 음성 인식 로직 (흔들림 효과 포함)
window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognizer = new SpeechRecognition();
recognizer.lang = "en-US";
function startRecognition() { try { recognizer.start(); } catch(e) {} }
function stopRecognition() { try { recognizer.abort(); } catch(e) {} }

recognizer.onresult = (event) => {
  const spoken = event.results[0][0].transcript.toLowerCase();
  const target = currentData[index].en.toLowerCase().replace(/[.,?!'"]/g, "");
  const sText = document.getElementById("sentence");
  if (spoken.includes(target) || target.includes(spoken)) {
    successSound.play(); sText.innerText = "Excellent!"; sText.style.color = "#39ff14";
    setTimeout(nextStep, 700);
  } else {
    failSound.play(); sText.innerText = "Try again"; sText.style.color = "#ff4b4b";
    sText.classList.remove("shake"); void sText.offsetWidth; sText.classList.add("shake"); // 흔들림 효과 복구
    setTimeout(playSentence, 800);
  }
};

window.nextStep = function() {
  index++; if (index >= currentData.length) { index = 0; cycle++; }
  const percent = Math.floor(((((cycle - 1) * currentData.length) + index) / (currentTotalCycles * currentData.length)) * 100);
  sendDataToGoogle(currentPart, percent + "%"); // 저장
  if (percent >= 100 && !isAlertShown) { 
    isAlertShown = true; 
    triggerFireworkConfetti(); 
    showCustomModal(`${currentPart} 100% 달성! 🎉`, () => playSentence()); 
    return; 
  }
  playSentence();
};

/* ======================================================
   5. AS Correction (피드백 학습)
   ====================================================== */
window.startASMode = async function() {
  currentPart = "AS Correction";
  const phone = document.getElementById("phone-input").value.trim(); showBox('dev-box');
  try {
    const res = await fetch(`${GOOGLE_SCRIPT_URL}?action=getAS&phone=${phone}&unit=Unit ${currentUnit}`);
    asData = await res.json();
    if(!asData || !asData.question) throw new Error();
    renderASPage(); showBox('as-box');
  } catch (e) { showCustomModal("첨삭 데이터가 없습니다.", () => showMenu()); }
};

function renderASPage() {
  const container = document.getElementById('as-box');
  const format = (t) => t ? String(t).replace(/\n/g, '<br>').replace(/\[(.*?)\]/g, '<span style="color:#ff4b4b; font-weight:bold;">$1</span>') : "";
  container.innerHTML = `
    <h2 style="color:#39ff14;">AS Correction</h2>
    <div style="text-align:left; border-bottom:1px solid #333; padding-bottom:10px; margin-bottom:15px;">
      <p style="color:#39ff14; font-size:12px;">[Question]</p><p style="font-size:18px;">${format(asData.question)}</p>
    </div>
    <div style="text-align:left; background:#222; padding:15px; border-radius:12px; margin-bottom:10px;">
      <p style="color:#888; font-size:12px;">My Answer</p><p style="color:#aaa; font-style:italic;">${format(asData.original)}</p>
    </div>
    <div style="text-align:left; background:#222; padding:15px; border-radius:12px; margin-bottom:20px;">
      <p style="color:#39ff14; font-size:12px;">Feedback</p><p style="font-size:17px;">${format(asData.corrected)}</p>
    </div>
    <div id="as-timer" style="font-size:28px; margin-bottom:20px; color:#39ff14; font-weight:bold;">00:00</div>
    <button id="as-start-btn" onclick="startASStudy()" style="background:#39ff14; color:#000;">Start Review</button>
    <div id="as-controls" style="display:none; flex-direction:column; gap:10px;">
      <button onclick="playASAudio()" style="background:#555;">질문 다시듣기</button>
      <button onclick="finishASStudy()" style="background:#39ff14; color:#000;">학습 완료</button>
    </div>
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

/* ======================================================
   6. Accurate Speaking (녹음 및 제출)
   ====================================================== */
window.startAccurateSpeakingMode = async function() {
  const phone = document.getElementById("phone-input").value.trim(); showBox('dev-box');
  try {
    const res = await fetch(`${GOOGLE_SCRIPT_URL}?action=getAS&phone=${phone}&unit=Unit ${currentUnit}`);
    asData = await res.json();
    document.getElementById('student-text-input').value = ""; // 초기화
    if (asData && asData.isSubmitted) {
      document.getElementById('as-q-text').innerText = "이미 제출된 과제입니다. ✔";
      showBox('as-record-box'); document.getElementById('as-listen-btn').style.display = 'none'; document.getElementById('recording-ui').style.display = 'none'; document.getElementById('submit-ui').style.display = 'none'; return;
    }
    document.getElementById('as-q-text').innerText = asData.question || "질문 정보 없음";
    showBox('as-record-box'); document.getElementById('as-listen-btn').style.display = 'block'; document.getElementById('recording-ui').style.display = 'none'; document.getElementById('submit-ui').style.display = 'none';
  } catch (e) { showCustomModal("로드 실패"); showMenu(); }
};

window.listenQuestion = function() { player.src = BASE_URL + currentType + "u/" + asData.audio; player.play(); player.onended = () => { startRecording(); }; };

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); mediaRecorder = new MediaRecorder(stream); audioChunks = [];
    document.getElementById('as-listen-btn').style.display = 'none'; document.getElementById('recording-ui').style.display = 'block';
    mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data); mediaRecorder.onstop = () => { processRecording(); }; mediaRecorder.start();
    recSeconds = 0; recordingTimer = setInterval(() => { recSeconds++; document.getElementById('rec-timer').innerText = `00:${recSeconds.toString().padStart(2,'0')}`; if (recSeconds >= 60) stopRecording(); }, 1000);
  } catch (e) { showCustomModal("마이크 권한 필요"); }
}

window.stopRecording = function() { if (mediaRecorder && mediaRecorder.state !== "inactive") { mediaRecorder.stop(); clearInterval(recordingTimer); document.getElementById('recording-ui').style.display = 'none'; document.getElementById('submit-ui').style.display = 'block'; } };

async function processRecording() { const blob = new Blob(audioChunks, { type: 'audio/webm' }); const reader = new FileReader(); reader.readAsDataURL(blob); reader.onloadend = () => { window.lastAudioBase64 = reader.result.split(',')[1]; }; }

window.submitAccurateSpeaking = async function() {
  const text = document.getElementById('student-text-input').value.trim(); if (!text) return showCustomModal("내용을 입력하세요.");
  showBox('dev-box');
  const payload = { action: "uploadAS", phone: document.getElementById("phone-input").value.trim(), unit: "Unit " + currentUnit, studentText: text, audioData: window.lastAudioBase64 };
  try {
    const res = await fetch(GOOGLE_SCRIPT_URL, { method: "POST", body: JSON.stringify(payload) });
    const data = await res.json();
    if (data.result === "success") { showCustomModal("제출 성공! 🎉", () => showMenu()); }
    else { throw new Error(); }
  } catch (e) { showCustomModal("제출 실패: 서버 연결 확인"); showBox('as-record-box'); }
};

/* ======================================================
   7. 반복듣기 및 리포트 (Repeat & Results)
   ====================================================== */
window.startRepeatMode = async function() {
  try {
    const res = await fetch(`${BASE_URL}${currentType}u/${currentType}u${currentUnit}.json`); currentData = await res.json();
    showBox('repeat-box'); const container = document.getElementById('repeat-box');
    container.innerHTML = `
      <h2 style="color:#39ff14;">Listen & Repeat</h2>
      <div style="margin-bottom:15px; color:#fff;">반복: <input type="number" id="repeat-count" value="3" style="width:45px; background:#222; color:#39ff14; border:1px solid #333; text-align:center;"> 사이클</div>
      <div id="repeat-list" style="height:350px; overflow-y:auto; border:1px solid #333; padding:10px; border-radius:10px; margin-bottom:15px;"></div>
      <div style="display:flex; gap:10px; justify-content:center;"><button id="repeat-start-btn" onclick="runRepeatAudio()" style="background:#39ff14; color:#000;">Start</button><button onclick="stopRepeatAudio()" style="background:#ff4b4b;">Stop</button></div>
      <button onclick="showMenu()" class="sub-action-btn" style="margin-top:10px;">Back</button>`;
    const list = document.getElementById('repeat-list');
    currentData.forEach((item, idx) => {
      const div = document.createElement('div'); div.id = `repeat-${idx}`; div.className = 'repeat-item';
      div.style.padding = "10px; border-bottom:1px solid #222; text-align:left;";
      div.innerHTML = `<div style="color:#fff; font-size:15px;">${item.en}</div><div style="color:#666; font-size:12px;">${item.ko}</div>`;
      list.appendChild(div);
    });
  } catch (e) { showCustomModal("로드 실패"); }
};

window.runRepeatAudio = async function() {
  const count = parseInt(document.getElementById('repeat-count').value) || 3;
  const btn = document.getElementById('repeat-start-btn');
  isRepeating = true; btn.disabled = true; btn.innerText = "Playing...";
  for (let c = 0; c < count; c++) {
    for (let i = 0; i < currentData.length; i++) {
      if (!isRepeating) return;
      await new Promise(resolve => {
        document.querySelectorAll('.repeat-item').forEach(r => r.style.background = "transparent");
        const el = document.getElementById(`repeat-${i}`);
        if(el) { el.style.background = "#1a3a1a"; el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
        player.src = `${BASE_URL}${currentType}u/${currentData[i].audio}`; player.play();
        player.onended = resolve;
      });
    }
  }
  isRepeating = false; btn.disabled = false; btn.innerText = "Start";
};
window.stopRepeatAudio = () => { isRepeating = false; player.pause(); document.getElementById('repeat-start-btn').disabled = false; document.getElementById('repeat-start-btn').innerText = "Start"; };

window.showResultsPage = async function() {
  const phone = document.getElementById("phone-input").value.trim(); showBox('dev-box');
  try {
    const res = await fetch(`${GOOGLE_SCRIPT_URL}?action=getResults&phone=${phone}`);
    const data = await res.json(); renderResultsCards(data); showBox('results-box');
  } catch (e) { showCustomModal("로드 실패"); }
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
      html += `<div style="display:flex; justify-content:space-between; margin-top:5px;"><span style="color:#aaa;">${row.part}</span><span style="color:#fff;">${val}</span></div>`;
    });
    card.innerHTML = html; container.appendChild(card);
  }
}

/* ======================================================
   8. 유틸리티 (Progress, Save, Confetti)
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
  var end = Date.now() + 2000;
  (function frame() {
    confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 } });
    confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 } });
    if (Date.now() < end) requestAnimationFrame(frame);
  }());
}
