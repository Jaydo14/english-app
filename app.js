// ======================================================
// 1. 기본 설정 (기존과 동일)
// ======================================================
const REPO_USER = "jaydo14"; 
const REPO_NAME = "english-app";
const BASE_URL = `https://raw.githubusercontent.com/${REPO_USER}/${REPO_NAME}/main/contents/`;
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyvwEzNZcFXOphpArxHWMd4C9UBbNQWpBdHnD-J8IP-nXQorOXkBxqDXkirs-j6iNaW/exec"; 

let currentTotalCycles = 18; 
let currentPart = "Script"; 

const bookDatabase = {
  "hc12u": { 1: "Music", 2: "Directions", 3: "Favorite beverage", 4: "Movies", 5: "Lunch", 6: "Vacation", 7: "New years", 8: "Switch lives" },
  "fc21u": { 1: "Restaurant", 2: "Birthday", 3: "Expenses", 4: "Dream job", 5: "Movies", 6: "Eating healthy", 7: "Traveling alone", 8: "Education" }
};

// ----------------------
// 2. 변수 및 오디오 설정 (기존과 동일)
// ----------------------
let currentType = ""; 
let currentUnit = 1;
let currentData = []; 
let index = 0;
let cycle = 1;
let isRepeating = false;
const player = new Audio();
let wakeLock = null;

const successSound = new Audio(BASE_URL + "common/success.mp3");
const failSound = new Audio(BASE_URL + "common/fail.mp3");

// ----------------------
// 3. 화면 관리 (안정화)
// ----------------------
function showBox(boxId) {
  const boxes = ['login-box', 'unit-selector', 'menu-box', 'study-box', 'repeat-box', 'dev-box'];
  boxes.forEach(id => {
    const el = document.getElementById(id);
    if(el) el.style.display = (id === boxId) ? 'block' : 'none';
  });
  const appContainer = document.getElementById("app");
  if(appContainer) appContainer.style.display = "block";
}

async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
      console.log('Wake Lock 활성화됨');
    }
  } catch (err) {
    console.log(`Wake Lock 에러: ${err.message}`);
  }
}

// ----------------------
// 4. 로그인 및 유닛 버튼 (기존과 동일)
// ----------------------
window.login = function () {
  const phoneInput = document.getElementById("phone-input");
  const inputVal = phoneInput.value.trim();
  if (inputVal.length < 1) return alert("번호를 입력해주세요.");
  
  const loginBtn = document.querySelector("#login-box button");
  loginBtn.disabled = true;
  loginBtn.innerText = "Checking...";

  fetch(GOOGLE_SCRIPT_URL + "?phone=" + inputVal)
  .then(res => res.json())
  .then(data => {
    if (data.result === "success") {
      currentType = data.type; 
      alert(`${data.name}님, 🔥오늘도 화이팅 입니다!🔥`);
      renderUnitButtons();
      showBox('unit-selector');
    } else {
      alert("등록되지 않은 번호입니다.");
      loginBtn.disabled = false;
      loginBtn.innerText = "Login";
    }
  }).catch(() => { 
    alert("접속 오류!"); 
    loginBtn.disabled = false; 
    loginBtn.innerText = "Login";
  });
};

function renderUnitButtons() {
  const container = document.getElementById("unit-buttons");
  if(!container) return;
  container.innerHTML = ""; 
  const currentTitles = bookDatabase[currentType] || {};
  for (let i = 1; i <= 8; i++) {
    const btn = document.createElement("button");
    const titleText = currentTitles[i] ? `<br><span class="unit-title" style="font-size:12px; font-weight:normal; color:rgba(0,0,0,0.6);">${currentTitles[i]}</span>` : "";
    btn.innerHTML = `Unit ${i}${titleText}`;
    btn.onclick = () => selectUnit(i);
    container.appendChild(btn);
  }
}

// ----------------------
// 5. 메뉴 및 모드 제어 (안전장치 추가)
// ----------------------
window.selectUnit = async function (n) {
  currentUnit = n;
  showBox('menu-box'); // 파일 로딩 전 미리 메뉴 박스로 이동하여 흐름 끊김 방지
  const menuTitle = document.getElementById("menu-title");
  if(menuTitle) menuTitle.innerText = `Unit ${n} Menu`;
};

window.showMenu = () => { 
  stopRepeatAudio(); 
  showBox('menu-box'); 
};
window.goBackToUnits = () => showBox('unit-selector');
window.showDevPage = (name) => {
  const devTitle = document.getElementById('dev-title');
  if(devTitle) devTitle.innerText = name;
  showBox('dev-box');
};

// ----------------------
// 6. 학습 모드 기능 (대소문자 및 로딩 실패 대응)
// ----------------------
window.startScriptMode = async function() {
  currentPart = "Script";
  currentTotalCycles = 18;
  const fileName = `${currentType.toLowerCase()}${currentUnit}.json`; // 소문자 강제 적용
  const url = BASE_URL + currentType.toLowerCase() + "/" + fileName;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("File not found");
    currentData = await response.json();
    
    const phone = document.getElementById("phone-input").value.trim();
    const saved = localStorage.getItem(`save_${phone}_unit${currentUnit}_script`);
    index = 0; cycle = 1;
    if (saved) { const p = JSON.parse(saved); index = p.index; cycle = p.cycle; }
    
    updateProgress();
    showBox('study-box');
  } catch (error) {
    alert(`[Script] 데이터를 불러올 수 없습니다.\nGitHub에 '${currentType.toLowerCase()}/${currentType.toLowerCase()}${currentUnit}.json' 파일이 있는지 확인하세요.`);
  }
};

window.startVocaMode = async function() {
  currentPart = "Voca"; 
  currentTotalCycles = 10;
  const fileName = `${currentType.toLowerCase()}${currentUnit}_voca.json`;
  const url = BASE_URL + currentType.toLowerCase() + "/" + fileName;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("File not found");
    currentData = await response.json();
    
    const phone = document.getElementById("phone-input").value.trim();
    const saved = localStorage.getItem(`save_${phone}_unit${currentUnit}_voca`);
    index = 0; cycle = 1;
    if (saved) { const p = JSON.parse(saved); index = p.index; cycle = p.cycle; }
    
    updateProgress();
    showBox('study-box');
  } catch (error) {
    alert(`[Voca] 데이터를 불러올 수 없습니다.\n파일명이 '${currentType.toLowerCase()}${currentUnit}_voca.json' 인지 확인하세요.`);
  }
};

window.startStudy = function () {
  if (currentData.length === 0) return alert("학습 데이터가 없습니다.");
  const startBtn = document.getElementById("start-btn");
  if(startBtn) startBtn.innerText = "Listen again";
  const skipBtn = document.getElementById("skip-btn");
  if(skipBtn) skipBtn.style.display = "inline-block";
  requestWakeLock();
  playSentence();
};

function playSentence() {
  if (!currentData[index]) return; // 데이터가 없을 경우 실행 중단
  const sText = document.getElementById("sentence");
  if(!sText) return;
  sText.classList.remove("success", "fail");
  sText.style.color = "#fff";
  const item = currentData[index];
  sText.innerText = item.en;
  const sentenceKor = document.getElementById("sentence-kor");
  if(sentenceKor) sentenceKor.innerText = item.ko;
  updateProgress();

  player.src = BASE_URL + currentType + "/" + item.audio;
  player.play().catch(e => console.log("Audio play error:", e));
  player.onended = () => {
    sText.style.color = "#ffff00";
    try { recognizer.start(); } catch(e) {}
  };
}

// ----------------------
// 7. 음성 인식 (데이터 유효성 검사 추가)
// ----------------------
window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognizer = new SpeechRecognition();
recognizer.lang = "en-US";

recognizer.onresult = (event) => {
  if (!currentData[index]) return; // 안전장치
  const spoken = event.results[0][0].transcript;
  const clean = (str) => str.toLowerCase().replace(/[.,?!'"]/g, "").trim();
  const userWords = clean(spoken).split(/\s+/);
  const targetWords = clean(currentData[index].en).split(/\s+/);
  
  let matches = 0;
  targetWords.forEach(w => { if (userWords.includes(w)) matches++; });

  const accuracy = matches / targetWords.length;
  const sText = document.getElementById("sentence");

  if (accuracy >= 0.6) { 
    successSound.play().catch(e => {}); 
    const praiseList = ["Great!", "Excellent!", "Perfect!", "Well done!", "Amazing!"];
    const randomPraise = praiseList[Math.floor(Math.random() * praiseList.length)];
    
    if(sText) {
        sText.innerText = randomPraise;
        sText.classList.add("success");
        sText.style.color = "#39ff14";
    }
    setTimeout(nextStep, 700); 
  } else {
    failSound.play().catch(e => {}); 
    if(sText) {
        sText.innerText = "Try again";
        sText.classList.add("fail");
        sText.style.color = "#ff4b4b"
    }
    setTimeout(playSentence, 800); 
  }
};

window.nextStep = function() {
  try { recognizer.abort(); } catch(e) {}
  if (currentData.length === 0) return;
  index++; 
  if (index >= currentData.length) { index = 0; cycle++; }
  const phone = document.getElementById("phone-input").value.trim();
  
  const saveSuffix = currentPart === "Voca" ? "_voca" : "_script";
  localStorage.setItem(`save_${phone}_unit${currentUnit}${saveSuffix}`, JSON.stringify({index, cycle}));
  
  const currentCount = ((cycle - 1) * currentData.length) + index;
  const percent = Math.floor((currentCount / (currentTotalCycles * currentData.length)) * 100);
  sendDataToGoogle(currentPart, percent + "%"); 
  
  playSentence();
};

// ----------------------
// 8. 반복 듣기 모드 (복구)
// ----------------------
window.startRepeatMode = async function() {
  const fileName = `${currentType.toLowerCase()}${currentUnit}.json`;
  const url = BASE_URL + currentType.toLowerCase() + "/" + fileName;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("File not found");
    currentData = await response.json();

    showBox('repeat-box');
    const list = document.getElementById('repeat-list');
    if(!list) return;
    list.innerHTML = "";
    currentData.forEach((item, idx) => {
      const div = document.createElement('div');
      div.className = 'repeat-item'; div.id = `repeat-${idx}`;
      div.innerHTML = `<div>${item.en}</div><div class="repeat-ko" style="font-size:13px; color:#888;">${item.ko}</div>`;
      list.appendChild(div);
    });
  } catch (error) {
    alert("데이터를 불러올 수 없습니다. GitHub 파일명을 확인하세요.");
  }
};

window.runRepeatAudio = async function() {
  const countInput = document.getElementById('repeat-count');
  const count = parseInt(countInput ? countInput.value : 3) || 3;
  isRepeating = true;
  requestWakeLock();
  for (let c = 0; c < count; c++) {
    if (!isRepeating) break;
    for (let i = 0; i < currentData.length; i++) {
      if (!isRepeating) break;
      await new Promise((resolve) => {
        document.querySelectorAll('.repeat-item').forEach(r => r.classList.remove('playing'));
        const el = document.getElementById(`repeat-${i}`);
        if(el) { el.classList.add('playing'); el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
        player.src = `${BASE_URL}${currentType}/${currentData[i].audio}`;
        player.play(); player.onended = () => resolve();
      });
    }
    sendDataToGoogle("반복듣기", (c + 1) + " cycle");
    if (c < count - 1 && isRepeating) await new Promise(r => setTimeout(r, 2000));
  }
  isRepeating = false;
};

window.stopRepeatAudio = () => { isRepeating = false; player.pause(); };

// ----------------------
// 9. 진행률 및 구글 전송 (기존 동일)
// ----------------------
function updateProgress() {
  if (!currentData || currentData.length === 0) return;
  const currentCount = ((cycle - 1) * currentData.length) + index;
  const percent = Math.floor((currentCount / (currentTotalCycles * currentData.length)) * 100);
  const progressPercent = document.getElementById("progress-percent");
  if(progressPercent) progressPercent.innerText = percent + "%";
  const progressBar = document.getElementById("progress");
  if(progressBar) progressBar.style.width = Math.min(percent, 100) + "%";
}

function sendDataToGoogle(part, val) {
  const phoneInput = document.getElementById("phone-input");
  if (!GOOGLE_SCRIPT_URL.startsWith("http")) return;
  const data = { 
    action: "save", 
    phone: phoneInput.value.trim(), 
    unit: "Unit " + currentUnit, 
    percent: val,
    part: part 
  };
  fetch(GOOGLE_SCRIPT_URL, { method: "POST", mode: "no-cors", body: JSON.stringify(data) });
}
