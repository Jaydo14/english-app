// ======================================================
// 1. 기본 설정 및 상수 영역
// ======================================================
const REPO_USER = "jaydo14"; 
const REPO_NAME = "english-app";
const BASE_URL = `https://raw.githubusercontent.com/${REPO_USER}/${REPO_NAME}/main/contents/`;
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwk4c5JBHkWj9aZ4LxHocVgvPn9-uoYexKJY3J8CcgDYIstC4WC-oJUgD2MJ_jRav8p/exec"; 

let currentTotalCycles = 18; 
let currentPart = "Script"; 
let userName = ""; 

// ⭐ fc21 교재 Unit 8까지 제목 반영 (이미지 기반)
const bookDatabase = {
  "hc12": { 1: "Music", 2: "Directions", 3: "Favorite beverage", 4: "Movies", 5: "Lunch", 6: "Vacation", 7: "New years", 8: "Switch lives" },
  "fc21": { 
    1: "Restaurant", 2: "Birthday", 3: "Expenses", 4: "Dream job", 5: "Movies", 6: "Eating healthy",
    7: "Traveling alone", 8: "Education" 
  }
};

// ----------------------
// 2. 변수 및 오디오 설정
// ----------------------
let currentType = ""; 
let currentUnit = 1;
let currentData = []; 
let index = 0;
let cycle = 1;
let isRepeating = false;
const player = new Audio();
let wakeLock = null;
let asTimer = null;
let asSeconds = 0;
let asData = null;
let isAlertShown = false; 
let modalCallback = null; 

const successSound = new Audio(BASE_URL + "common/success.mp3");
const failSound = new Audio(BASE_URL + "common/fail.mp3");

// ----------------------
// 3. 화면 관리 및 커스텀 팝업
// ----------------------
function showBox(boxId) {
  const boxes = ['login-box', 'unit-selector', 'menu-box', 'study-box', 'repeat-box', 'dev-box', 'as-box', 'results-box'];
  boxes.forEach(id => {
    const el = document.getElementById(id);
    if(el) el.style.display = (id === boxId) ? 'block' : 'none';
  });
  document.getElementById("app").style.display = "block";
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

// ----------------------
// 4. 로그인 및 유닛 버튼
// ----------------------
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
      showCustomModal(`${userName}님, 🔥오늘도 화이팅 입니다!🔥`);
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

window.showMenu = () => { stopRepeatAudio(); clearInterval(asTimer); showBox('menu-box'); };
window.goBackToUnits = () => showBox('unit-selector');

// ----------------------
// 5. AS Correction (⭐ 줄바꿈 반영 로직 추가)
// ----------------------
window.startASMode = async function() {
  currentPart = "AS Correction";
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
  
  // ⭐ [수정] 줄바꿈(\n)을 HTML 태그(<br>)로 변환하는 로직 추가
  const formatText = (text) => {
    if (!text) return "";
    return String(text)
      .replace(/\n/g, '<br>') // 구글 시트 줄바꿈 반영
      .replace(/\[(.*?)\]/g, '<span style="color:#ff4b4b; font-weight:bold;">$1</span>');
  };

  container.innerHTML = `
    <h2 style="margin-bottom:20px; color:#39ff14;">AS Correction</h2>
    <div style="text-align:left; margin-bottom:15px; border-bottom:1px solid #333; padding-bottom:10px;">
      <p style="color:#39ff14; font-size:14px; margin-bottom:5px;">[Teacher's Question]</p>
      <p style="font-size:18px; line-height:1.4;">${formatText(asData.question)}</p>
    </div>
    <div style="text-align:left; background:#222; padding:15px; border-radius:12px; margin-bottom:10px;">
      <p style="color:#888; font-size:12px; margin-bottom:5px;">My Answer</p>
      <p style="color:#aaa; font-style:italic; font-size:15px;">${formatText(asData.original)}</p>
    </div>
    <div style="text-align:left; background:#222; padding:15px; border-radius:12px; margin-bottom:20px;">
      <p style="color:#39ff14; font-size:12px; margin-bottom:5px;">Feedback</p>
      <p style="font-size:17px; line-height:1.4;">${formatText(asData.corrected)}</p>
    </div>
    <div id="as-timer" style="font-size:28px; margin-bottom:20px; color:#39ff14; font-weight:bold;">00:00</div>
    <button id="as-start-btn" onclick="startASStudy()">Start</button>
    <div id="as-controls" style="display:none; flex-direction:column; align-items:center; gap:10px; width:100%;">
      <button onclick="playASAudio()" style="background:#555; width:95%;">질문 다시듣기</button>
      <button onclick="finishASStudy()" style="background:#39ff14; color:#000; width:95%;">학습 완료</button>
    </div>
    <button onclick="showMenu()" class="sub-action-btn" style="width:65% !important; margin-top:15px;">Back to Menu</button>
  `;
}

window.startASStudy = function() {
  document.getElementById('as-start-btn').style.display = 'none';
  document.getElementById('as-controls').style.display = 'flex';
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
  player.play().catch(() => showCustomModal("음원을 찾을 수 없습니다."));
};

window.finishASStudy = function() {
  clearInterval(asTimer);
  sendDataToGoogle("AS Correction", Math.floor(asSeconds/60)+"분 "+(asSeconds%60)+"초");
  showCustomModal(`${userName}님, Have a good day❤`, () => showMenu());
};

// ----------------------
// 6. 학습 모드
// ----------------------
window.startScriptMode = async function() { currentPart = "Script"; currentTotalCycles = 18; loadStudyData(`${currentType}u${currentUnit}.json`, "script"); };
window.startVocaMode = async function() { currentPart = "Voca"; currentTotalCycles = 10; loadStudyData(`${currentType}u${currentUnit}_voca.json`, "voca"); };

async function loadStudyData(fileName, suffix) {
  isAlertShown = false; 
  try {
    const res = await fetch(BASE_URL + currentType + "u/" + fileName);
    currentData = await res.json();
    const phone = document.getElementById("phone-input").value.trim();
    const saved = localStorage.getItem(`save_${phone}_${currentType}_unit${currentUnit}_${suffix}`);
    index = 0; cycle = 1;
    if (saved) { const p = JSON.parse(saved); index = p.index; cycle = p.cycle; }
    
    const startBtn = document.getElementById("start-btn");
    if(startBtn) startBtn.innerText = "Start";
    const skipBtn = document.getElementById("skip-btn");
    if(skipBtn) skipBtn.style.display = "none";

    updateProgress(); showBox('study-box');
  } catch (e) { showCustomModal("학습 파일을 불러오지 못했습니다."); }
}

window.startStudy = function () {
  const startBtn = document.getElementById("start-btn");
  if(startBtn) startBtn.innerText = "Listen again";
  const skipBtn = document.getElementById("skip-btn");
  if(skipBtn) skipBtn.style.display = "inline-block";
  requestWakeLock(); playSentence();
};

function playSentence() {
  const sText = document.getElementById("sentence");
  if (!sText) return;
  const item = currentData[index];
  sText.classList.remove("shake", "success", "fail"); 
  sText.innerText = item.en; sText.style.color = "#fff"; sText.style.fontSize = "18px";
  document.getElementById("sentence-kor").innerText = item.ko;
  updateProgress();
  player.src = BASE_URL + currentType + "u/" + item.audio;
  player.play();
  player.onended = () => { sText.style.color = "#ffff00"; try { recognizer.start(); } catch(e) {} };
}

// ----------------------
// 7. 음성 인식 및 흔들림 효과
// ----------------------
window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognizer = new SpeechRecognition();
recognizer.lang = "en-US";
recognizer.onresult = (event) => {
  const spoken = event.results[0][0].transcript.toLowerCase();
  const target = currentData[index].en.toLowerCase().replace(/[.,?!'"]/g, "");
  const sText = document.getElementById("sentence");
  
  if (spoken.includes(target) || target.includes(spoken)) {
    successSound.play(); 
    if(sText) { sText.innerText = "Excellent!"; sText.style.color = "#39ff14"; sText.classList.remove("shake"); }
    setTimeout(nextStep, 700);
  } else {
    failSound.play(); 
    if(sText) {
      sText.innerText = "Try again"; sText.style.color = "#ff4b4b";
      sText.classList.remove("shake"); void sText.offsetWidth; sText.classList.add("shake"); 
    }
    setTimeout(playSentence, 800);
  }
};

window.nextStep = function() {
  try { recognizer.abort(); } catch(e) {}
  index++; if (index >= currentData.length) { index = 0; cycle++; }
  const phone = document.getElementById("phone-input").value.trim();
  const suffix = currentPart === "Voca" ? "voca" : "script";
  localStorage.setItem(`save_${phone}_${currentType}_unit${currentUnit}_${suffix}`, JSON.stringify({index, cycle}));
  
  const currentCount = ((cycle - 1) * currentData.length) + index;
  const percent = Math.floor((currentCount / (currentTotalCycles * currentData.length)) * 100);
  sendDataToGoogle(currentPart, percent + "%"); 

  if (percent >= 100 && !isAlertShown) {
    isAlertShown = true; 
    triggerFireworkConfetti();
    showCustomModal(`축하합니다! 🎉\n${userName}님, ${currentPart} 파트 100% 목표를 달성하셨습니다!\n계속해서 완벽하게 익혀보세요! 🔥`, () => playSentence());
    return;
  }
  playSentence();
};

// ----------------------
// 8. Progress Report (⭐ 중복 제거 수정)
// ----------------------
window.showResultsPage = async function() {
  const phone = document.getElementById("phone-input").value.trim();
  showBox('dev-box');
  try {
    const res = await fetch(`${GOOGLE_SCRIPT_URL}?action=getResults&phone=${phone}`);
    const data = await res.json();
    renderResultsCards(data); showBox('results-box');
  } catch (e) { showCustomModal("데이터 로드 실패", () => showBox('unit-selector')); }
};

function renderResultsCards(data) {
  const container = document.getElementById('results-content');
  container.innerHTML = "";
  
  // 파트명이 있는 유효한 데이터만 필터링 (중복 방지)
  const validData = data.filter(row => row.part && row.part.trim() !== "");

  for (let u = 0; u < 8; u++) {
    const card = document.createElement('div');
    card.style.cssText = "background:#222; border:1px solid #333; border-radius:15px; padding:15px; margin-bottom:15px; text-align:left;";
    let html = `<h3 style="color:#39ff14; border-bottom:1px solid #333; padding-bottom:5px;">Unit ${u+1}</h3>`;
    validData.forEach(row => {
      let val = row.units[u] || "-";
      if (!isNaN(val) && val !== "" && !val.toString().includes('분') && !val.toString().includes('cycle') && !val.toString().includes('%')) {
        val = Math.round(parseFloat(val) * 100) + "%";
      }
      html += `<div style="display:flex; justify-content:space-between; margin-top:5px; font-size:14px;"><span style="color:#aaa;">${row.part}</span><span style="color:${val==="100%"?"#39ff14":"#fff"}; font-weight:bold;">${val}</span></div>`;
    });
    card.innerHTML = html; container.appendChild(card);
  }
}

function updateProgress() {
  if (!currentData.length) return;
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

window.startRepeatMode = async function() {
  try {
    const res = await fetch(BASE_URL + currentType + "u/" + `${currentType}u${currentUnit}.json`);
    currentData = await res.json();
    showBox('repeat-box');
    const list = document.getElementById('repeat-list');
    list.innerHTML = "";
    currentData.forEach((item, idx) => {
      const div = document.createElement('div');
      div.className = 'repeat-item'; div.id = `repeat-${idx}`;
      div.innerHTML = `<div>${item.en}</div><div style="font-size:13px; color:#888;">${item.ko}</div>`;
      list.appendChild(div);
    });
  } catch (e) { showCustomModal("반복 학습 데이터를 불러오지 못했습니다."); }
};

window.runRepeatAudio = async function() {
  const count = parseInt(document.getElementById('repeat-count').value) || 3;
  isRepeating = true; requestWakeLock();
  for (let c = 0; c < count; c++) {
    if (!isRepeating) break;
    for (let i = 0; i < currentData.length; i++) {
      if (!isRepeating) break;
      await new Promise((resolve) => {
        document.querySelectorAll('.repeat-item').forEach(r => r.classList.remove('playing'));
        const el = document.getElementById(`repeat-${i}`);
        if(el) { el.classList.add('playing'); el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
        player.src = `${BASE_URL}${currentType}u/${currentData[i].audio}`; player.play();
        player.onended = () => resolve();
      });
    }
  }
  isRepeating = false;
};

function stopRepeatAudio() { isRepeating = false; player.pause(); }
