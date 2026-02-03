// ======================================================
// 1. 기본 설정 및 상수
// ======================================================
const REPO_USER = "jaydo14"; 
const REPO_NAME = "english-app";
const BASE_URL = `https://raw.githubusercontent.com/${REPO_USER}/${REPO_NAME}/main/contents/`;
// ⭐ [주의] Apps Script '새 배포' 후 URL 교체 필수!
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzDwJVuSzzi-N-7EdI0IXShq4TNdMPQXxxpVxQ3X-tf569xXsH9SuHfpSHM0joNqC1H/exec"; 

let currentTotalCycles = 18; 
let currentPart = "Script"; 
let userName = ""; 
let currentType = ""; 
let currentUnit = 1;
let currentData = []; 
let index = 0;
let cycle = 1;
let isRepeating = false;

// [기능 추가] 반복듣기 상태 저장
let repeatIndex = 0; 
let repeatCycleCount = 0; 

// [복원] 다양한 칭찬 멘트 리스트
const praiseList = ["Excellent!", "Great job!", "Amazing!", "Perfect!", "Fantastic!", "Superb!"];

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

const bookDatabase = {
  "hc12": { 1: "Music", 2: "Directions", 3: "Favorite beverage", 4: "Movies", 5: "Lunch", 6: "Vacation", 7: "New years", 8: "Switch lives" },
  "fc21": { 1: "Restaurant", 2: "Birthday", 3: "Expenses", 4: "Dream job", 5: "Movies", 6: "Eating healthy", 7: "Traveling alone", 8: "Education" }
};

// ======================================================
// 2. UI 및 팝업 (이모티콘 복원)
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

// ======================================================
// 3. 로그인
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
        showBox('unit-selector');
        // [복원] 환영 이모티콘
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
// 4. 학습 엔진 (Script/Vocab, Shake, Skip, Random Praise)
// ======================================================
window.startScriptMode = async function() { currentPart = "Script"; currentTotalCycles = 18; loadStudyData(`${currentType}u${currentUnit}.json`); };
// [수정] 파트명 "Vocab"으로 통일 (시트와 일치)
window.startVocaMode = async function() { currentPart = "Vocab"; currentTotalCycles = 10; loadStudyData(`${currentType}u${currentUnit}_voca.json`); };

async function loadStudyData(fileName) {
  isAlertShown = false; 
  try {
    const res = await fetch(BASE_URL + currentType + "u/" + fileName);
    currentData = await res.json();
    index = 0; cycle = 1;
    
    // UI 초기화
    document.getElementById("start-btn").innerText = "Start";
    
    // 스킵 버튼 생성 (없을 경우)
    const studyBox = document.getElementById('study-box');
    if (studyBox && !document.getElementById('skip-btn')) {
         const startB = document.getElementById('start-btn');
         const skipBtn = document.createElement('button');
         skipBtn.id = 'skip-btn'; skipBtn.innerText = 'Skip';
         skipBtn.onclick = () => window.skipSentence();
         skipBtn.style.display = 'none'; skipBtn.style.marginLeft = '10px'; skipBtn.style.background = '#555';
         if(startB) startB.parentNode.insertBefore(skipBtn, startB.nextSibling);
    } else {
         document.getElementById('skip-btn').style.display = 'none';
    }

    updateProgress(); showBox('study-box');
  } catch (e) { showCustomModal("학습 파일을 불러오지 못했습니다."); }
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

  // [복원] 50% 일치 로직 + 랜덤 칭찬 멘트
  if (checkSimilarity(spoken, target) >= 0.5) {
    successSound.play(); 
    // 랜덤 칭찬 선택
    const praise = praiseList[Math.floor(Math.random() * praiseList.length)];
    sText.innerText = praise; 
    sText.style.color = "#39ff14";
    setTimeout(nextStep, 700);
  } else {
    failSound.play(); 
    sText.innerText = "Try again"; 
    sText.style.color = "#ff4b4b";
    
    // [복원] 흔들림 효과 (reflow trigger)
    sText.classList.remove("shake");
    void sText.offsetWidth; // 강제 리플로우
    sText.classList.add("shake");
    
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
    // [복원] 완료 이모티콘
    showCustomModal(`${currentPart} 100% 달성! 🎉`, () => playSentence()); return; 
  }
  playSentence();
};

// ======================================================
// 5. AS Correction & Accurate Speaking
// ======================================================
window.startASMode = async function() {
  currentPart = "AS Correction"; // [수정] 파트명 명시
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
window.playASAudio = () => { player.src = BASE_URL + currentType + "u/" + asData.audio; player.play(); };
window.finishASStudy = function() {
  clearInterval(asTimer); const timeStr = Math.floor(asSeconds/60) + "분 " + (asSeconds%60) + "초";
  sendDataToGoogle("AS Correction", timeStr); // [수정] AS 저장
  showCustomModal(`${userName}님, 학습이 완료되었습니다! ✔`, () => showMenu());
};

window.startAccurateSpeakingMode = async function() {
  const phone = document.getElementById("phone-input").value.trim(); showBox('dev-box');
  try {
    const res = await fetch(`${GOOGLE_SCRIPT_URL}?action=getAS&phone=${phone}&unit=Unit ${currentUnit}`);
    asData = await res.json();
    document.getElementById('student-text-input').value = "";
    if (asData && asData.isSubmitted) {
      document.getElementById('as-q-text').innerText = "이 유닛의 과제는 이미 정상적으로 전송되었습니다. ✔";
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
    .then(res => res.json()).then(data => { if(data.result === "success") showCustomModal("성공적으로 제출되었습니다! 🎉", () => showMenu()); });
};

// ======================================================
// 6. 반복듣기 (이어듣기 + 2초 대기 + 버튼 생성)
// ======================================================
window.startRepeatMode = async function() {
  try {
    const res = await fetch(`${BASE_URL}${currentType}u/${currentType}u${currentUnit}.json`);
    currentData = await res.json();
    // [수정] 초기 진입 시에만 리셋 (이어듣기 방지용 아님) - 메뉴에서 다시 들어오면 리셋
    repeatIndex = 0; repeatCycleCount = 0; isRepeating = false;
    
    showBox('repeat-box');
    
    // [복원] 반복듣기 UI 동적 생성
    const container = document.getElementById('repeat-box');
    container.innerHTML = `
      <h2 style="color:#39ff14;">Listen & Repeat</h2>
      <div style="margin-bottom:15px; color:#fff;">
        반복 횟수: <input type="number" id="repeat-count" value="3" min="1" style="width:50px; background:#222; color:#39ff14; border:1px solid #333; border-radius:5px; text-align:center;"> 사이클
      </div>
      <div id="repeat-list" style="height:350px; overflow-y:auto; border:1px solid #333; padding:10px; border-radius:10px; margin-bottom:15px;"></div>
      <div style="display:flex; gap:10px; justify-content:center;">
        <button id="repeat-start-btn" onclick="runRepeatAudio()" style="background:#39ff14; color:#000; width:120px;">Start</button>
        <button onclick="stopRepeatAudio()" style="background:#ff4b4b; color:#fff; width:120px;">Stop</button>
      </div>
      <button onclick="stopRepeatAudio(); showMenu();" class="sub-action-btn" style="margin-top:15px;">Back to Menu</button>
    `;

    const list = document.getElementById('repeat-list');
    currentData.forEach((item, idx) => {
      const div = document.createElement('div'); div.id = `repeat-${idx}`; div.className = 'repeat-item';
      div.style.padding = "10px"; div.style.borderBottom = "1px solid #222"; div.style.textAlign = "left";
      div.innerHTML = `<div style="color:#fff; font-size:15px;">${item.en}</div><div style="color:#666; font-size:12px;">${item.ko}</div>`;
      list.appendChild(div);
    });
  } catch (e) { showCustomModal("로드 실패"); }
};

window.runRepeatAudio = async function() {
  const count = parseInt(document.getElementById('repeat-count').value) || 3;
  const btn = document.getElementById('repeat-start-btn');
  if (isRepeating) return; isRepeating = true; btn.disabled = true; btn.innerText = "Playing...";

  // [기능 추가] 이어듣기 로직 (멈춘 사이클, 문장부터 시작)
  for (let c = repeatCycleCount; c < count; c++) {
    repeatCycleCount = c;
    let sIdx = (c === repeatCycleCount) ? repeatIndex : 0; 
    
    for (let i = sIdx; i < currentData.length; i++) {
      if (!isRepeating) { repeatIndex = i; return; } // 중단 시 위치 저장
      await new Promise(resolve => {
        document.querySelectorAll('.repeat-item').forEach(r => r.style.background = "transparent");
        const el = document.getElementById(`repeat-${i}`);
        if(el) { el.style.background = "#1a3a1a"; el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
        player.src = `${BASE_URL}${currentType}u/${currentData[i].audio}`; player.play();
        player.onended = resolve;
      });
    }
    repeatIndex = 0; // 사이클 완료 후 인덱스 초기화
    
    // [기능 추가] 반복듣기 학습량 저장 (사이클마다 갱신)
    const prog = Math.floor(((c + 1) / count) * 100);
    sendDataToGoogle("반복듣기", prog + "%");

    // [기능 추가] 사이클 간 2초 대기 (마지막 사이클 제외)
    if (c < count - 1 && isRepeating) {
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  isRepeating = false; btn.disabled = false; btn.innerText = "Start"; repeatIndex = 0; repeatCycleCount = 0;
};

window.stopRepeatAudio = () => { 
  isRepeating = false; 
  player.pause(); 
  const btn = document.getElementById('repeat-start-btn');
  if(btn) { btn.disabled = false; btn.innerText = "Start"; }
};

// ======================================================
// 7. 유틸리티 (Progress, 저장, Confetti)
// ======================================================
function updateProgress() {
  const currentCount = ((cycle - 1) * currentData.length) + index;
  const percent = Math.floor((currentCount / (currentTotalCycles * currentData.length)) * 100);
  document.getElementById("progress-percent").innerText = percent + "%";
  document.getElementById("progress").style.width = Math.min(percent, 100) + "%";
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
