// ======================================================
// 1. 기본 설정 및 상수 영역
// ======================================================
const REPO_USER = "jaydo14"; 
const REPO_NAME = "english-app";
const BASE_URL = `https://raw.githubusercontent.com/${REPO_USER}/${REPO_NAME}/main/contents/`;
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyvwEzNZcFXOphpArxHWMd4C9UBbNQWpBdHnD-J8IP-nXQorOXkBxqDXkirs-j6iNaW/exec"; 

// [파트 관리 변수 추가]
let currentTotalCycles = 18; 
let currentPart = "Script"; 

const bookDatabase = {
  "hc12u": { 1: "Music", 2: "Directions", 3: "Favorite beverage", 4: "Movies", 5: "Lunch", 6: "Vacation", 7: "New years", 8: "Switch lives" },
  "fc21u": { 1: "Restaurant", 2: "Birthday", 3: "Expenses", 4: "Dream job", 5: "Movies", 6: "Eating healthy", 7: "Traveling alone", 8: "Education" }
};

// ----------------------
// 2. 변수 및 오디오 설정 영역
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
// 3. 화면 관리 및 유틸리티 기능
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
// 4. 로그인 및 유닛 버튼 생성 기능
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
// 5. 메뉴 및 모드 제어 기능
// ----------------------
window.selectUnit = async function (n) {
  currentUnit = n;
  const fileName = `${currentType}${currentUnit}.json`;
  const url = BASE_URL + currentType + "/" + fileName;

  try {
    const response = await fetch(url);
    currentData = await response.json();
    const menuTitle = document.getElementById("menu-title");
    if(menuTitle) menuTitle.innerText = `Unit ${n} Menu`;
    showBox('menu-box');
  } catch (error) {
    alert("파일을 찾을 수 없습니다.");
  }
};

window.showMenu = () => { stopRepeatAudio(); showBox('menu-box'); };
window.goBackToUnits = () => showBox('unit-selector');
window.showDevPage = (name) => {
  const devTitle = document.getElementById('dev-title');
  if(devTitle) devTitle.innerText = name;
  showBox('dev-box');
};

// ----------------------
// 6. 학습 모드 기능 (Script / Voca 파트 구분 로직)
// ----------------------

// [수정] Script 모드 시작: 항상 원래의 Script 파일을 새로 불러옵니다.
window.startScriptMode = async function() {
  currentPart = "Script";
  currentTotalCycles = 18; // Script는 18바퀴 기준
  
  // 원래의 Script 파일명 (예: hc12u1.json)
  const fileName = `${currentType}${currentUnit}.json`;
  const url = BASE_URL + currentType + "/" + fileName;

  try {
    const response = await fetch(url);
    currentData = await response.json(); // 데이터를 Script로 교체
    
    const phone = document.getElementById("phone-input").value.trim();
    const saved = localStorage.getItem(`save_${phone}_unit${currentUnit}_script`);
    index = 0; cycle = 1;
    if (saved) { const p = JSON.parse(saved); index = p.index; cycle = p.cycle; }
    
    updateProgress();
    showBox('study-box');
  } catch (error) {
    alert("Script 파일을 찾을 수 없습니다.");
  }
};

// [유지] Voca 모드 시작: Voca 전용 파일을 불러옵니다.
window.startVocaMode = async function() {
  currentPart = "Voca"; 
  currentTotalCycles = 10; // Voca는 10바퀴 기준
  
  const phone = document.getElementById("phone-input").value.trim();
  const saved = localStorage.getItem(`save_${phone}_unit${currentUnit}_voca`);
  
  // Voca 전용 파일명 (예: hc12u1_voca.json)
  const fileName = `${currentType}${currentUnit}_voca.json`;
  const url = BASE_URL + currentType + "/" + fileName;

  try {
    const response = await fetch(url);
    currentData = await response.json(); // 데이터를 Voca로 교체
    
    index = 0; cycle = 1;
    if (saved) { const p = JSON.parse(saved); index = p.index; cycle = p.cycle; }
    
    updateProgress();
    showBox('study-box');
  } catch (error) {
    alert("Voca 파일을 찾을 수 없습니다.");
  }
};

window.startStudy = function () {
  const startBtn = document.getElementById("start-btn");
  if(startBtn) startBtn.innerText = "Listen again";
  const skipBtn = document.getElementById("skip-btn");
  if(skipBtn) skipBtn.style.display = "inline-block";
  requestWakeLock();
  playSentence();
};

function playSentence() {
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
  player.play();
  player.onended = () => {
    sText.style.color = "#ffff00";
    try { recognizer.start(); } catch(e) {}
  };
}

// ----------------------
// 7. 음성 인식 및 정확도 체크 기능
// ----------------------
// (기존 사용자님의 recognizer.onresult 로직을 그대로 유지하세요)
// ... 중간 생략 ...

window.nextStep = function() {
  try { recognizer.abort(); } catch(e) {}
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
// 8. 반복 듣기 모드 기능
// ----------------------
// [수정] 반복듣기 시작: 항상 원래의 Script 문장들이 나오도록 새로 불러옵니다.
window.startRepeatMode = async function() {
  const fileName = `${currentType}${currentUnit}.json`;
  const url = BASE_URL + currentType + "/" + fileName;

  try {
    const response = await fetch(url);
    currentData = await response.json(); // 데이터를 Script로 복구

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
    alert("데이터를 불러올 수 없습니다.");
  }
};

// (runRepeatAudio 함수는 기존 그대로 유지)

// ----------------------
// 9. 진행률 계산 및 구글 전송 기능
// ----------------------
function updateProgress() {
  if (!currentData.length) return;
  const currentCount = ((cycle - 1) * currentData.length) + index;
  const percent = Math.floor((currentCount / (currentTotalCycles * currentData.length)) * 100);
  const progressPercent = document.getElementById("progress-percent");
  if(progressPercent) progressPercent.innerText = percent + "%";
  const progressBar = document.getElementById("progress");
  if(progressBar) progressBar.style.width = Math.min(percent, 100) + "%";
}

// [수정] part 파라미터를 추가했습니다.
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
