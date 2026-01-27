// 1. 기본 설정
const REPO_USER = "jaydo14"; 
const REPO_NAME = "english-app";
const BASE_URL = `https://raw.githubusercontent.com/${REPO_USER}/${REPO_NAME}/main/contents/`;
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby4tsK2iqumwsr9-BsBTYXeb_sFdBKBCwa0Vd1gMchYDryJ-dpSxinm5WDB2TjkkQ0d/exec"; 

const totalCycles = 18; 

const bookDatabase = {
  "hc12u": { 1: "Music", 2: "Directions", 3: "Favorite beverage", 4: "Movies", 5: "Lunch", 6: "Vacation", 7: "New years", 8: "Switch lives" },
  "fc21u": { 1: "Restaurant", 2: "Birthday", 3: "Expenses", 4: "Dream job", 5: "Movies", 6: "Eating healthy", 7: "Traveling alone", 8: "Education" }
};

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

// 2. 화면 관리 및 화면 꺼짐 방지
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
    }
  } catch (err) {
    console.log(err);
  }
}

// 3. 로그인 및 유닛 버튼 생성
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

// 4. 메뉴 및 모드 제어
window.selectUnit = async function (n) {
  currentUnit = n;
  const fileName = `${currentType}${currentUnit}.json`;
  const fullUrl = BASE_URL + currentType + "/" + fileName;

  try {
    const response = await fetch(fullUrl);
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

// 5. Script 학습 (50% 인식)
window.startScriptMode = () => {
  const phoneInput = document.getElementById("phone-input");
  const saveKey = `save_${phoneInput.value.trim()}_unit${currentUnit}`;
  const savedData = localStorage.getItem(saveKey);
  index = 0; cycle = 1;
  if (savedData) {
    const parsed = JSON.parse(savedData);
    index = parsed.index; cycle = parsed.cycle;
  }
  updateProgress();
  showBox('study-box');
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
  const sentenceText = document.getElementById("sentence");
  if(!sentenceText) return;
  sentenceText.classList.remove("success", "fail");
  sentenceText.style.color = "#fff"; 
  const item = currentData[index];
  sentenceText.innerText = item.en;
  const sentenceKor = document.getElementById("sentence-kor");
  if(sentenceKor) sentenceKor.innerText = item.ko;
  updateProgress();

  player.src = BASE_URL + currentType + "/" + item.audio;
  player.play().catch(e => console.log(e));
  player.onended = () => {
    sentenceText.style.color = "#ffff00"; 
    try { recognizer.start(); } catch(e) {}
  };
}

window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognizer = new SpeechRecognition();
recognizer.lang = "en-US";
recognizer.onresult = (event) => {
  const spoken = event.results[0][0].transcript;
  const clean = (str) => str.toLowerCase().replace(/[.,?!'"]/g, "").trim();
  const userWords = clean(spoken).split(/\s+/); 
  const targetWords = clean(currentData[index].en).split(/\s+/);
  let matchCount = 0;
  targetWords.forEach(word => { if (userWords.includes(word)) matchCount++; });

  if (matchCount / targetWords.length >= 0.5) {
    successSound.play().catch(e => {}); 
    const sText = document.getElementById("sentence");
    if(sText) { sText.innerText = "Great!"; sText.classList.add("success"); sText.style.color = "#39ff14"; }
    setTimeout(nextStep, 600); 
  } else {
    failSound.play().catch(e => {}); 
    const sText = document.getElementById("sentence");
    if(sText) { sText.innerText = "Try again"; sText.classList.add("fail"); sText.style.color = "#ff4b4b"; }
    setTimeout(playSentence, 600);
  }
};

window.nextStep = function() {
  try { recognizer.abort(); } catch(e) {}
  index++; 
  if (index >= currentData.length) { index = 0; cycle++; }
  const phoneInput = document.getElementById("phone-input");
  const saveKey = `save_${phoneInput.value.trim()}_unit${currentUnit}`;
  localStorage.setItem(saveKey, JSON.stringify({index, cycle}));
  sendDataToGoogle();
  if (cycle === totalCycles + 1) alert("🎉 100% 달성!");
  playSentence();
};

// 6. 반복 듣기
window.startRepeatMode = () => {
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
};

window.runRepeatAudio = async function() {
  isRepeating = true;
  const count = parseInt(document.getElementById('repeat-count').value) || 1;
  requestWakeLock();
  for (let c = 0; c < count; c++) {
    if (!isRepeating) break;
    for (let i = 0; i < currentData.length; i++) {
      if (!isRepeating) break;
      await new Promise((resolve) => {
        document.querySelectorAll('.repeat-item').forEach(r => r.classList.remove('playing'));
        const el = document.getElementById(`repeat-${i}`);
        if(el) { el.classList.add('playing'); el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
        player.src = BASE_URL + currentType + "/" + currentData[i].audio;
        player.play(); player.onended = () => resolve();
      });
    }
    if (c < count - 1 && isRepeating) await new Promise(r => setTimeout(r, 2000));
  }
  isRepeating = false;
};

window.stopRepeatAudio = () => { isRepeating = false; player.pause(); };

// 7. 진행률
function updateProgress() {
  if (!currentData.length) return;
  const currentCount = ((cycle - 1) * currentData.length) + index;
  const percent = Math.floor((currentCount / (totalCycles * currentData.length)) * 100);
  const progressPercent = document.getElementById("progress-percent");
  if(progressPercent) progressPercent.innerText = percent + "%";
  const progressBar = document.getElementById("progress");
  if(progressBar) progressBar.style.width = Math.min(percent, 100) + "%";
}

function sendDataToGoogle() {
  const phoneInput = document.getElementById("phone-input");
  const percent = Math.floor((((cycle - 1) * currentData.length) + index) / (totalCycles * currentData.length) * 100);
  const data = { action: "save", phone: phoneInput.value.trim(), unit: "Unit " + currentUnit, percent: percent };
  fetch(GOOGLE_SCRIPT_URL, { method: "POST", mode: "no-cors", body: JSON.stringify(data) });
}
