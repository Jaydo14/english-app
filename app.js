// ======================================================
// 1. 기본 설정 (절대 주소 끝에 / 를 확인하세요)
// ======================================================
const REPO_USER = "jaydo14"; 
const REPO_NAME = "english-app";
// 주소 끝에 /가 꼭 있어야 파일 경로가 뭉치지 않습니다.
const BASE_URL = `https://raw.githubusercontent.com/${REPO_USER}/${REPO_NAME}/main/contents/`;
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby4tsK2iqumwsr9-BsBTYXeb_sFdBKBCwa0Vd1gMchYDryJ-dpSxinm5WDB2TjkkQ0d/exec"; 

const totalCycles = 18; 

const bookDatabase = {
  "hc12u": { 1: "Music", 2: "Directions", 3: "Favorite beverage and snack", 4: "Where you like to watch movies", 5: "Lunch", 6: "Vacation", 7: "New years", 8: "Switch lives" },
  "fc21u": { 1: "Restaurant", 2: "Birthday", 3: "Expenses", 4: "Dream job", 5: "Movies", 6: "Eating healthy", 7: "Traveling alone", 8: "Education" }
};

// ----------------------
// 2. 변수 및 요소 가져오기
// ----------------------
const loginBox = document.getElementById("login-box");
const app = document.getElementById("app");
const unitButtonsContainer = document.getElementById("unit-buttons");
const phoneInput = document.getElementById("phone-input");
const menuBox = document.getElementById("menu-box");
const studyBox = document.getElementById("study-box");
const devBox = document.getElementById("dev-box");
const repeatBox = document.getElementById("repeat-box");
const allBoxes = [loginBox, menuBox, studyBox, devBox, repeatBox];

const sentenceText = document.getElementById("sentence");
const sentenceKor = document.getElementById("sentence-kor");
const progressBar = document.getElementById("progress");
const progressPercent = document.getElementById("progress-percent");
const startBtn = document.getElementById("start-btn");
const skipBtn = document.getElementById("skip-btn");
const repeatList = document.getElementById("repeat-list");
const repeatCountInput = document.getElementById("repeat-count");

let currentType = ""; 
let currentUnit = 1;
let currentData = []; 
let index = 0;
let cycle = 1;
let isRepeating = false;
const player = new Audio(); 
let wakeLock = null; 

// ----------------------
// 3. 유틸리티 함수
// ----------------------
function showBox(targetBox) {
  allBoxes.forEach(box => { if(box) box.style.display = "none"; });
  document.querySelectorAll('.box').forEach(b => b.style.display = 'none');
  if(targetBox) {
    targetBox.style.display = "block";
    app.style.display = "block";
  }
}

async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
    }
  } catch (err) { console.log(err); }
}

// ----------------------
// 4. 로그인 및 유닛 선택 (수정됨: Loading 문구 제거)
// ----------------------
window.login = function () {
  const inputVal = phoneInput.value.trim();
  const loginBtn = document.querySelector("#login-box button");
  if (!inputVal) { alert("번호를 입력해주세요."); return; }

  loginBtn.disabled = true;
  loginBtn.innerText = "Checking...";

  fetch(GOOGLE_SCRIPT_URL + "?phone=" + inputVal)
  .then(res => res.json())
  .then(data => {
    if (data.result === "success") {
      currentType = data.type; 
      alert(`${data.name}님, 오늘도 화이팅! 🔥`);
      renderUnitButtons();
      loginBox.style.display = "none";
      app.style.display = "block";
      document.getElementById("welcome-msg").innerText = "Unit Select";
      unitButtonsContainer.parentElement.style.display = "block";
    } else {
      alert("등록되지 않은 번호입니다.");
      loginBtn.disabled = false;
      loginBtn.innerText = "Login";
    }
  }).catch(() => { alert("접속 오류!"); loginBtn.disabled = false; });
};

function renderUnitButtons() {
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

window.selectUnit = async function (n) {
  currentUnit = n;
  const fileName = `${currentType}${currentUnit}.json`;
  // 폴더 경로(currentType)를 주소 중간에 명확히 넣어줍니다.
  const fullUrl = BASE_URL + currentType + "/" + fileName;

  try {
    const response = await fetch(fullUrl);
    if (!response.ok) throw new Error();
    currentData = await response.json();
    document.getElementById("menu-title").innerText = `Unit ${currentUnit}`;
    showMenu();
  } catch (e) {
    alert("데이터 파일을 찾을 수 없습니다. 폴더와 파일명을 확인해주세요.");
  }
};

window.showMenu = function() {
  unitButtonsContainer.parentElement.style.display = "none";
  showBox(menuBox);
};

window.goBackToUnit = function() {
  showBox(null);
  unitButtonsContainer.parentElement.style.display = "block";
  document.getElementById("welcome-msg").innerText = "Unit Select";
};

// ----------------------
// 5. Script 학습 모드
// ----------------------
window.startScriptMode = function() {
  showBox(studyBox);
  requestWakeLock();
  const userPhone = phoneInput.value.trim();
  const saved = localStorage.getItem(`save_${userPhone}_unit${currentUnit}`);
  index = 0; cycle = 1;
  if (saved) { const p = JSON.parse(saved); index = p.index; cycle = p.cycle; }
  startBtn.innerText = "Start";
  skipBtn.style.display = "none";
  sentenceText.innerText = "Ready?";
  sentenceKor.innerText = "";
  updateProgress();
};

window.startStudy = function () {
  startBtn.innerText = "Listen again";
  skipBtn.style.display = "inline-block";
  playSentence();
};

function playSentence() {
  sentenceText.classList.remove("success", "fail");
  const item = currentData[index];
  sentenceText.innerText = item.en;
  sentenceKor.innerText = item.ko;
  updateProgress();

  if (item.audio) {
    // 소리 파일도 방 이름(currentType) 폴더 안에서 찾습니다.
    player.src = BASE_URL + currentType + "/" + item.audio;
    player.play().catch(e => console.log(e));
  }

  player.onended = () => {
    sentenceText.style.color = "var(--primary)"; 
    try { recognizer.start(); } catch(e) {}
  };
}

// ----------------------
// 6. 음성 인식 로직
// ----------------------
window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognizer = new SpeechRecognition();
recognizer.lang = "en-US";

recognizer.onresult = (event) => {
  const spoken = event.results[0][0].transcript;
  checkAnswer(spoken, currentData[index].en);
};

recognizer.onerror = () => {
  sentenceText.classList.add("fail");
  setTimeout(playSentence, 800);
};

function checkAnswer(spoken, target) {
  const clean = (s) => s.toLowerCase().replace(/[.,?!'"]/g, "").trim();
  const userWords = clean(spoken).split(/\s+/);
  const targetWords = clean(target).split(/\s+/);
  let matches = 0;
  targetWords.forEach(w => { if(userWords.includes(w)) matches++; });

  if (matches / targetWords.length >= 0.5) {
    sentenceText.innerText = "Excellent!";
    sentenceText.classList.add("success");
    setTimeout(nextStep, 1000);
  } else {
    sentenceText.classList.add("fail");
    setTimeout(playSentence, 800);
  }
}

window.nextStep = function() {
  try { recognizer.abort(); } catch(e) {}
  index++;
  const saveKey = `save_${phoneInput.value.trim()}_unit${currentUnit}`;
  if (index >= currentData.length) { index = 0; cycle++; }
  localStorage.setItem(saveKey, JSON.stringify({index, cycle}));
  sendDataToGoogle();
  if (cycle > totalCycles) { alert("Perfect! 100% Done."); return; }
  playSentence();
};

// ----------------------
// 7. 반복 듣기 모드 (번호 제거 & 2초 대기)
// ----------------------
window.startRepeatMode = function() {
  showBox(repeatBox);
  requestWakeLock();
  isRepeating = false;
  repeatList.innerHTML = "";
  currentData.forEach((item, idx) => {
    const div = document.createElement("div");
    div.className = "repeat-item"; 
    // 문장 앞에 있던 ${idx + 1}. 을 삭제했습니다.
    div.innerHTML = `
      <div style="color:var(--primary); font-weight:700; margin-bottom:4px;">${item.en}</div>
      <div style="color:var(--text-sub); font-size:14px;">${item.ko}</div>
    `;
    repeatList.appendChild(div);
  });
};

window.runRepeatAudio = async function() {
  if (isRepeating) return;
  const count = parseInt(repeatCountInput.value) || 3;
  isRepeating = true;
  const btn = document.getElementById("repeat-play-btn");
  btn.innerText = "Playing...";
  btn.disabled = true;

  for (let c = 1; c <= count; c++) {
    if (!isRepeating) break;
    for (let i = 0; i < currentData.length; i++) {
      if (!isRepeating) break;
      await playAudioPromise(currentData[i].audio, i);
    }
    // 사이클 종료 후 2초 대기 (요청 사항)
    if (c < count && isRepeating) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  isRepeating = false;
  btn.innerText = "Start Play";
  btn.disabled = false;
};

window.stopRepeatAudio = function() {
  isRepeating = false;
  player.pause();
  document.getElementById("repeat-play-btn").disabled = false;
  document.getElementById("repeat-play-btn").innerText = "Start Play";
};

function playAudioPromise(file, idx) {
  return new Promise((resolve) => {
    const items = repeatList.children;
    if(items[idx]) {
      items[idx].style.borderColor = "var(--primary)";
      items[idx].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    // 오디오 파일 경로에 폴더명(currentType) 추가
    player.src = BASE_URL + currentType + "/" + file;
    player.play().then(() => {
      player.onended = () => {
        if(items[idx]) items[idx].style.borderColor = "transparent";
        resolve();
      };
    }).catch(() => resolve());
  });
}

// ----------------------
// 8. 프로그레스 및 서버 저장
// ----------------------
function updateProgress() {
  if (!currentData.length) return;
  const total = totalCycles * currentData.length;
  const current = ((cycle - 1) * currentData.length) + index;
  const p = Math.min(Math.floor((current / total) * 100), 100);
  progressPercent.innerText = p + "%";
  progressBar.style.width = p + "%";
}

function sendDataToGoogle() {
  if (!GOOGLE_SCRIPT_URL.startsWith("http")) return;
  const data = { action: "save", phone: phoneInput.value.trim(), unit: "Unit " + currentUnit, percent: progressPercent.innerText.replace("%","") };
  fetch(GOOGLE_SCRIPT_URL, { method: "POST", mode: "no-cors", body: JSON.stringify(data) });
}
