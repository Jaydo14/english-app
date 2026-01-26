// ======================================================
// 1. 기본 설정 및 상수
// ======================================================
const REPO_USER = "jaydo14"; 
const REPO_NAME = "english-app";
const BASE_URL = `https://raw.githubusercontent.com/${REPO_USER}/${REPO_NAME}/main/contents/`;
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby4tsK2iqumwsr9-BsBTYXeb_sFdBKBCwa0Vd1gMchYDryJ-dpSxinm5WDB2TjkkQ0d/exec"; 

const totalCycles = 18; 

const bookDatabase = {
  "hc12u": { 1: "Music", 2: "Directions", 3: "Favorite beverage", 4: "Movies", 5: "Lunch", 6: "Vacation", 7: "New years", 8: "Switch lives" },
  "fc21u": { 1: "Restaurant", 2: "Birthday", 3: "Expenses", 4: "Dream job", 5: "Movies", 6: "Eating healthy", 7: "Traveling alone", 8: "Education" }
};

// 변수 설정
let currentType = ""; 
let currentUnit = 1;
let currentData = []; 
let index = 0;
let cycle = 1;
let isRepeating = false;
const player = new Audio();
let wakeLock = null; 

// ----------------------
// 2. 화면 관리 함수 (이게 중요합니다)
// ----------------------
function showBox(boxId) {
  // 모든 박스들을 리스트로 만듭니다.
  const boxes = ['login-box', 'unit-selector', 'menu-box', 'study-box', 'repeat-box', 'dev-box'];
  boxes.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      // 선택한 박스만 보이고 나머지는 숨깁니다.
      el.style.display = (id === boxId) ? 'block' : 'none';
    }
  });
  // 앱 전체 컨테이너는 항상 보이게 합니다.
  document.getElementById("app").style.display = "block";
}

// ----------------------
// 3. 로그인 (가장 확실한 방식)
// ----------------------
window.login = function () {
  const phoneInput = document.getElementById("phone-input");
  const inputVal = phoneInput.value.trim();
  
  if (inputVal.length < 1) {
    alert("번호를 입력해주세요.");
    return;
  }

  const loginBtn = document.querySelector("#login-box button");
  loginBtn.disabled = true;
  loginBtn.innerText = "확인 중...";

  fetch(GOOGLE_SCRIPT_URL + "?phone=" + inputVal)
  .then(res => res.json())
  .then(data => {
    if (data.result === "success") {
      currentType = data.type; 
      alert(`${data.name}님, 🔥오늘도 화이팅 입니다!🔥`);
      renderUnitButtons(); // 유닛 버튼 만들기
      showBox('unit-selector'); // 유닛 선택 화면으로 이동
    } else {
      alert("등록되지 않은 번호입니다.");
      loginBtn.disabled = false;
      loginBtn.innerText = "Login";
    }
  })
  .catch(error => {
    console.error(error);
    alert("접속 오류!");
    loginBtn.disabled = false;
    loginBtn.innerText = "Login";
  });
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
// 4. 메뉴 및 학습 로직
// ----------------------
window.selectUnit = async function (n) {
  currentUnit = n;
  const fileName = `${currentType}${currentUnit}.json`;
  const fullUrl = BASE_URL + currentType + "/" + fileName;

  try {
    const response = await fetch(fullUrl);
    if (!response.ok) throw new Error();
    currentData = await response.json();
    document.getElementById("menu-title").innerText = `Unit ${n} Menu`;
    showBox('menu-box');
  } catch (error) {
    alert("파일을 찾을 수 없습니다.");
  }
};

window.showMenu = () => showBox('menu-box');
window.goBackToUnits = () => showBox('unit-selector');
window.showDevPage = (name) => {
  document.getElementById('dev-title').innerText = name;
  showBox('dev-box');
};

// Script 학습 모드
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
  document.getElementById("sentence").innerText = "Start 버튼을 눌러주세요";
  document.getElementById("sentence-kor").innerText = "";
};

window.startStudy = function () {
  document.getElementById("start-btn").innerText = "Listen again";
  document.getElementById("skip-btn").style.display = "inline-block";
  playSentence();
};

function playSentence() {
  const sentenceText = document.getElementById("sentence");
  const sentenceKor = document.getElementById("sentence-kor");
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

// 음성 인식 및 다음 단계 (기존 로직 유지)
window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognizer = new SpeechRecognition();
recognizer.lang = "en-US";
recognizer.onresult = (event) => {
  const spoken = event.results[0][0].transcript;
  const clean = (str) => str.toLowerCase().replace(/[.,?!'"]/g, "").trim();
  if (clean(spoken).includes(clean(currentData[index].en))) {
    document.getElementById("sentence").innerText = "Great!";
    document.getElementById("sentence").classList.add("success");
    setTimeout(nextStep, 500);
  } else {
    document.getElementById("sentence").classList.add("fail");
    setTimeout(playSentence, 500);
  }
};

window.nextStep = function() {
  try { recognizer.abort(); } catch(e) {}
  index++; 
  if (index >= currentData.length) { index = 0; cycle++; }
  const saveKey = `save_${document.getElementById("phone-input").value.trim()}_unit${currentUnit}`;
  localStorage.setItem(saveKey, JSON.stringify({index, cycle}));
  sendDataToGoogle();
  playSentence();
};

// ----------------------
// 5. 반복 듣기 (새 기능)
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

// 진행률 및 전송
function updateProgress() {
  if (!currentData.length) return;
  const percent = Math.floor((((cycle - 1) * currentData.length) + index) / (totalCycles * currentData.length) * 100);
  document.getElementById("progress-percent").innerText = percent + "%";
  document.getElementById("progress").style.width = Math.min(percent, 100) + "%";
}

function sendDataToGoogle() {
  const percent = Math.floor((((cycle - 1) * currentData.length) + index) / (totalCycles * currentData.length) * 100);
  const data = { action: "save", phone: document.getElementById("phone-input").value.trim(), unit: "Unit " + currentUnit, percent: percent };
  fetch(GOOGLE_SCRIPT_URL, { method: "POST", mode: "no-cors", body: JSON.stringify(data) });
}
