// ======================================================
// 1. 기본 설정 및 상수 [cite: 1, 2, 3, 4]
// ======================================================
const REPO_USER = "jaydo14"; 
const REPO_NAME = "english-app";
const BASE_URL = `https://raw.githubusercontent.com/${REPO_USER}/${REPO_NAME}/main/contents/`;
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby4tsK2iqumwsr9-BsBTYXeb_sFdBKBCwa0Vd1gMchYDryJ-dpSxinm5WDB2TjkkQ0d/exec"; 

const totalCycles = 18; // 100% 기준 사이클 [cite: 3, 43]

const bookDatabase = {
  "hc12u": { 1: "Music", 2: "Directions", 3: "Favorite beverage and snack", 4: "Where you like to watch movies", 5: "Lunch", 6: "Vacation", 7: "New years", 8: "Switch lives" },
  "fc21u": { 1: "Restaurant", 2: "Birthday", 3: "Expenses", 4: "Dream job", 5: "Movies", 6: "Eating healthy", 7: "Traveling alone", 8: "Education" }
};

// ----------------------
// 2. 변수 및 요소 가져오기 [cite: 5, 6, 7, 8]
// ----------------------
let currentType = ""; 
let currentUnit = 1;
let currentData = []; 
let index = 0;
let cycle = 1;
let isRepeating = false;
const player = new Audio();
let wakeLock = null; 

const sentenceText = document.getElementById("sentence");
const sentenceKor = document.getElementById("sentence-kor");
const progressBar = document.getElementById("progress");
const progressPercent = document.getElementById("progress-percent");
const phoneInput = document.getElementById("phone-input");

// ----------------------
// 3. 화면 관리 및 꺼짐 방지 [cite: 9, 10, 11, 12]
// ----------------------
function showBox(boxId) {
  const boxes = ['login-box', 'unit-selector', 'menu-box', 'study-box', 'repeat-box', 'dev-box'];
  boxes.forEach(id => {
    const el = document.getElementById(id);
    if(el) el.style.display = (id === boxId) ? 'block' : 'none';
  });
  document.getElementById("app").style.display = "block";
}

async function requestWakeLock() {
  try { if ('wakeLock' in navigator) { wakeLock = await navigator.wakeLock.request('screen'); } }
  catch (err) { console.log(err); }
}

// ----------------------
// 4. 로그인 및 유닛 생성 [cite: 13, 14, 15, 16, 17, 18, 19]
// ----------------------
window.login = function () {
  const inputVal = phoneInput.value.trim();
  if (inputVal.length < 1) return alert("번호를 입력해주세요.");
  
  const loginBtn = document.querySelector("#login-box button");
  loginBtn.disabled = true;
  loginBtn.innerText = "확인 중...";

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
  }).catch(() => { alert("접속 오류!"); loginBtn.disabled = false; });
};

function renderUnitButtons() {
  const unitButtonsContainer = document.getElementById("unit-buttons");
  unitButtonsContainer.innerHTML = ""; 
  const currentTitles = bookDatabase[currentType] || {};
  for (let i = 1; i <= 8; i++) {
    const btn = document.createElement("button");
    const titleText = currentTitles[i] ? `<br><span class="unit-title">${currentTitles[i]}</span>` : "";
    btn.innerHTML = `Unit ${i}${titleText}`;
    btn.onclick = () => selectUnit(i);
    unitButtonsContainer.appendChild(btn);
  }
}

// ----------------------
// 5. 유닛 선택 및 메뉴 [cite: 20, 21, 23, 27]
// ----------------------
window.selectUnit = async function (n) {
  currentUnit = n;
  const fileName = `${currentType}${currentUnit}.json`;
  const fullUrl = BASE_URL + currentType + "/" + fileName;

  try {
    const response = await fetch(fullUrl);
    currentData = await response.json();
    document.getElementById("menu-title").innerText = `Unit ${n} Menu`;
    showBox('menu-box'); // 유닛 선택 후 메뉴로 이동
  } catch (error) {
    alert(`[오류] 파일을 찾을 수 없습니다.`);
  }
};

window.showMenu = () => showBox('menu-box');
window.goBackToUnits = () => showBox('unit-selector');
window.showDevPage = (name) => {
  document.getElementById('dev-title').innerText = name;
  showBox('dev-box');
};

// ----------------------
// 6. Script 학습 모드 [cite: 24, 25, 26, 28, 29, 30, 31]
// ----------------------
window.startScriptMode = () => {
  const saveKey = `save_${phoneInput.value.trim()}_unit${currentUnit}`;
  const savedData = localStorage.getItem(saveKey);
  index = 0; cycle = 1;
  if (savedData) {
    const parsed = JSON.parse(savedData);
    index = parsed.index; cycle = parsed.cycle;
  }
  updateProgress();
  showBox('study-box');
  sentenceText.innerText = "Start 버튼을 눌러주세요";
  sentenceKor.innerText = "";
};

window.startStudy = function () {
  document.getElementById("start-btn").innerText = "Listen again";
  document.getElementById("skip-btn").style.display = "inline-block";
  requestWakeLock();
  playSentence();
};

function playSentence() {
  sentenceText.classList.remove("success", "fail");
  sentenceText.style.color = "#fff"; 
  const item = currentData[index];
  sentenceText.innerText = item.en;
  sentenceKor.innerText = item.ko;
  updateProgress();

  if (item.audio) {
    player.src = BASE_URL + currentType + "/" + item.audio;
    player.play().catch(e => console.log(e));
  }
  player.onended = () => {
    sentenceText.style.color = "#ffff00"; 
    try { recognizer.start(); } catch(e) {}
  };
}

// ----------------------
// 7. 음성 인식 및 50% 정확도 체크 [cite: 34, 35, 36, 37, 38, 39]
// ----------------------
window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognizer = new SpeechRecognition();
recognizer.lang = "en-US";

recognizer.onresult = (event) => {
  const spoken = event.results[0][0].transcript;
  const target = currentData[index].en;
  
  const clean = (str) => str.toLowerCase().replace(/[.,?!'"]/g, "").trim();
  const userWords = clean(spoken).split(/\s+/); 
  const targetWords = clean(target).split(/\s+/);

  let matchCount = 0;
  targetWords.forEach(word => { if (userWords.includes(word)) matchCount++; });

  const accuracy = matchCount / targetWords.length;

  if (accuracy >= 0.5) { // 50% 이상 성공 시 
    sentenceText.innerText = "Great!";
    sentenceText.classList.add("success");
    sentenceText.style.color = "#39ff14"; 
    setTimeout(nextStep, 500); 
  } else {
    sentenceText.innerText = "Try again";
    sentenceText.classList.add("fail");
    sentenceText.style.color = "#ff4b4b"; 
    setTimeout(playSentence, 500);
  }
};

window.nextStep = function() { // [cite: 40, 41, 42, 44]
  try { recognizer.abort(); } catch(e) {}
  index++; 
  const userPhone = phoneInput.value.trim();
  const saveKey = `save_${userPhone}_unit${currentUnit}`;
  if (index >= currentData.length) { index = 0; cycle++; }
  localStorage.setItem(saveKey, JSON.stringify({index, cycle}));
  sendDataToGoogle();
  if (cycle === totalCycles + 1) alert("🎉 100% 달성! 축하합니다!");
  playSentence();
};

// ----------------------
// 8. 반복 듣기 (새 기능)
// ----------------------
window.startRepeatMode = () => {
  showBox('repeat-box');
  const list = document.getElementById('repeat-list');
  list.innerHTML = "";
  currentData.forEach((item, idx) => {
    const div = document.createElement('div');
    div.className = 'repeat-item'; div.id = `repeat-${idx}`;
    div.innerHTML = `<div>${item.en}</div><div class="repeat-ko">${item.ko}</div>`;
    list.appendChild(div);
  });
};

window.runRepeatAudio = async function() {
  const count = parseInt(document.getElementById('repeat-count').value) || 1;
  isRepeating = true;
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
    if (c < count - 1 && isRepeating) await new Promise(r => setTimeout(r, 2000));
  }
  isRepeating = false;
};

window.stopRepeatAudio = () => { isRepeating = false; player.pause(); };

// ----------------------
// 9. 진행률 및 구글 전송 [cite: 45, 46, 47, 48, 49, 50, 51, 52, 53]
// ----------------------
function getGlobalProgress() {
  if (!currentData.length) return 0;
  const currentCount = ((cycle - 1) * currentData.length) + index;
  return Math.floor((currentCount / (totalCycles * currentData.length)) * 100);
}

function updateProgress() {
  const percent = getGlobalProgress();
  progressPercent.innerText = percent + "%";
  progressBar.style.width = Math.min(percent, 100) + "%";
}

function sendDataToGoogle() {
  if (!GOOGLE_SCRIPT_URL.startsWith("http")) return;
  const data = { action: "save", phone: phoneInput.value.trim(), unit: "Unit " + currentUnit, percent: getGlobalProgress() };
  fetch(GOOGLE_SCRIPT_URL, { method: "POST", mode: "no-cors", body: JSON.stringify(data) });
}
