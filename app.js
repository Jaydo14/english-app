// ======================================================
// 1. 기본 설정 및 상수
// ======================================================
const REPO_USER = "jaydo14"; 
const REPO_NAME = "english-app";
const BASE_URL = `https://raw.githubusercontent.com/${REPO_USER}/${REPO_NAME}/main/contents/`;
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby4tsK2iqumwsr9-BsBTYXeb_sFdBKBCwa0Vd1gMchYDryJ-dpSxinm5WDB2TjkkQ0d/exec"; 

const totalCycles = 18; // 100% 기준 사이클 [cite: 3]

const bookDatabase = {
  "hc12u": { 1: "Music", 2: "Directions", 3: "Favorite beverage", 4: "Movies", 5: "Lunch", 6: "Vacation", 7: "New years", 8: "Switch lives" },
  "fc21u": { 1: "Restaurant", 2: "Birthday", 3: "Expenses", 4: "Dream job", 5: "Movies", 6: "Eating healthy", 7: "Traveling alone", 8: "Education" }
}; [cite: 4]

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
let wakeLock = null; [cite: 8, 9]

// 효과음 설정 (common 폴더에 올리신 파일을 불러옵니다)
const successSound = new Audio(BASE_URL + "common/success.mp3");
const failSound = new Audio(BASE_URL + "common/fail.mp3");

// ----------------------
// 3. 화면 관리 및 꺼짐 방지
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
} [cite: 9]

// ----------------------
// 4. 로그인 및 유닛 생성
// ----------------------
window.login = function () {
  const phoneInput = document.getElementById("phone-input");
  const inputVal = phoneInput.value.trim();
  if (inputVal.length < 1) return alert("번호를 입력해주세요."); [cite: 17]
  
  const loginBtn = document.querySelector("#login-box button");
  loginBtn.disabled = true;
  loginBtn.innerText = "확인 중...";

  fetch(GOOGLE_SCRIPT_URL + "?phone=" + inputVal)
  .then(res => res.json())
  .then(data => {
    if (data.result === "success") {
      currentType = data.type; 
      alert(`${data.name}님, 🔥오늘도 화이팅 입니다!🔥`); [cite: 18]
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
} [cite: 14, 15]

// ----------------------
// 5. 유닛 선택 및 메뉴
// ----------------------
window.selectUnit = async function (n) {
  currentUnit = n;
  const fileName = `${currentType}${currentUnit}.json`;
  const fullUrl = BASE_URL + currentType + "/" + fileName;

  try {
    const response = await fetch(fullUrl);
    currentData = await response.json();
    document.getElementById("menu-title").innerText = `Unit ${n} Menu`;
    showBox('menu-box'); 
  } catch (error) {
    alert(`[오류] 파일을 찾을 수 없습니다.`);
  }
}; [cite: 20, 21, 23]

window.showMenu = () => showBox('menu-box');
window.goBackToUnits = () => showBox('unit-selector');
window.showDevPage = (name) => {
  document.getElementById('dev-title').innerText = name;
  showBox('dev-box');
};

// ----------------------
// 6. Script 학습 모드
// ----------------------
window.startScriptMode = () => {
  const phoneInput = document.getElementById("phone-input");
  const saveKey = `save_${phoneInput.value.trim()}_unit${currentUnit}`;
  const savedData = localStorage.getItem(saveKey);
  index = 0; cycle = 1;
  if (savedData) {
    const parsed = JSON.parse(savedData);
    index = parsed.index; cycle = parsed.cycle;
  } [cite: 24, 25]
  updateProgress();
  showBox('study-box');
  document.getElementById("sentence").innerText = "Start 버튼을 눌러주세요";
  document.getElementById("sentence-kor").innerText = "";
};

window.startStudy = function () {
  document.getElementById("start-btn").innerText = "Listen again";
  document.getElementById("skip-btn").style.display = "inline-block";
  requestWakeLock();
  playSentence();
}; [cite: 28, 29]

function playSentence() {
  const sentenceText = document.getElementById("sentence");
  const sentenceKor = document.getElementById("sentence-kor");
  sentenceText.classList.remove("success", "fail");
  sentenceText.style.color = "#fff"; 
  const item = currentData[index];
  sentenceText.innerText = item.en;
  sentenceKor.innerText = item.ko;
  updateProgress(); [cite: 30]

  if (item.audio) {
    player.src = BASE_URL + currentType + "/" + item.audio;
    player.play().catch(e => console.log(e));
  } [cite: 31]
  player.onended = () => {
    sentenceText.style.color = "#ffff00"; 
    try { recognizer.start(); } catch(e) {}
  }; [cite: 33]
}

// ----------------------
// 7. 음성 인식 및 효과음 로직
// ----------------------
window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognizer = new SpeechRecognition();
recognizer.lang = "en-US"; [cite: 34, 35]

recognizer.onresult = (event) => {
  const spoken = event.results[0][0].transcript;
  const target = currentData[index].en;
  
  const clean = (str) => str.toLowerCase().replace(/[.,?!'"]/g, "").trim();
  const userWords = clean(spoken).split(/\s+/); 
  const targetWords = clean(target).split(/\s+/);

  let matchCount = 0;
  targetWords.forEach(word => { if (userWords.includes(word)) matchCount++; });

  const accuracy = matchCount / targetWords.length;

  const sentenceText = document.getElementById("sentence");

  if (accuracy >= 0.5) { // 50% 인식 로직
    successSound.play().catch(e => console.log(e)); // 성공 효과음
    sentenceText.innerText = "Great!";
    sentenceText.classList.add("success");
    sentenceText.style.color = "#39ff14"; 
    setTimeout(nextStep, 500); 
  } else {
    failSound.play().catch(e => console.log(e)); // 실패 효과음
    sentenceText.innerText = "Try again";
    sentenceText.classList.add("fail");
    sentenceText.style.color = "#ff4b4b"; 
    setTimeout(playSentence, 500);
  }
}; [cite: 37, 38]

recognizer.onerror = () => {
  failSound.play().catch(e => console.log(e)); // 인식 에러 시 실패음
  document.getElementById("sentence").classList.add("fail");
  setTimeout(playSentence, 500);
}; [cite: 36]

window.nextStep = function() {
  try { recognizer.abort(); } catch(e) {}
  index++; 
  const phoneInput = document.getElementById("phone-input");
  const userPhone = phoneInput.value.trim();
  const saveKey = `save_${userPhone}_unit${currentUnit}`;
  if (index >= currentData.length) { index = 0; cycle++; }
  localStorage.setItem(saveKey, JSON.stringify({index, cycle})); [cite: 39, 40, 42]
  sendDataToGoogle();
  if (cycle === totalCycles + 1) alert("🎉 100% 달성! 축하합니다!"); [cite: 43]
  playSentence();
};

// ----------------------
// 8. 반복 듣기 (2초 대기)
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
    if (c < count - 1 && isRepeating) await new Promise(r => setTimeout(r, 2000)); // 2초 대기
  }
  isRepeating = false;
};

window.stopRepeatAudio = () => { isRepeating = false; player.pause(); };

// ----------------------
// 9. 진행률 및 구글 전송
// ----------------------
function getGlobalProgress() {
  if (!currentData.length) return 0;
  const currentCount = ((cycle - 1) * currentData.length) + index;
  return Math.floor((currentCount / (totalCycles * currentData.length)) * 100);
} [cite: 47]

function updateProgress() {
  const percent = getGlobalProgress();
  document.getElementById("progress-percent").innerText = percent + "%";
  document.getElementById("progress").style.width = Math.min(percent, 100) + "%";
} [cite: 51, 52]

function sendDataToGoogle() {
  const phoneInput = document.getElementById("phone-input");
  if (!GOOGLE_SCRIPT_URL.startsWith("http")) return;
  const data = { action: "save", phone: phoneInput.value.trim(), unit: "Unit " + currentUnit, percent: getGlobalProgress() };
  fetch(GOOGLE_SCRIPT_URL, { method: "POST", mode: "no-cors", body: JSON.stringify(data) });
} [cite: 49, 50]
