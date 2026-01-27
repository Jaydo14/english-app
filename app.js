// ======================================================
[cite_start]// 1. 기본 설정 및 상수 [cite: 1-4]
// ======================================================
const REPO_USER = "jaydo14"; 
const REPO_NAME = "english-app";
const BASE_URL = `https://raw.githubusercontent.com/${REPO_USER}/${REPO_NAME}/main/contents/`;
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby4tsK2iqumwsr9-BsBTYXeb_sFdBKBCwa0Vd1gMchYDryJ-dpSxinm5WDB2TjkkQ0d/exec"; 

const totalCycles = 18; [cite_start]// 100% 기준 사이클 [cite: 3]

const bookDatabase = {
  "hc12u": { 1: "Music", 2: "Directions", 3: "Favorite beverage", 4: "Movies", 5: "Lunch", 6: "Vacation", 7: "New years", 8: "Switch lives" },
  "fc21u": { 1: "Restaurant", 2: "Birthday", 3: "Expenses", 4: "Dream job", 5: "Movies", 6: "Eating healthy", 7: "Traveling alone", 8: "Education" }
};

// ----------------------
[cite_start]// 2. 변수 및 오디오 설정 [cite: 5-8]
// ----------------------
let currentType = ""; 
let currentUnit = 1;
let currentData = []; 
let index = 0;
let cycle = 1;
let isRepeating = false;
const player = new Audio();
let wakeLock = null; [cite_start]// 화면 꺼짐 방지용 [cite: 9]

// 효과음 설정 (common 폴더에 올린 파일 사용)
const successSound = new Audio(BASE_URL + "common/success.mp3");
const failSound = new Audio(BASE_URL + "common/fail.mp3");

// ----------------------
[cite_start]// 3. 화면 관리 및 꺼짐 방지 [cite: 9-12]
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
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen'); [cite_start]// [cite: 9]
      console.log('Wake Lock 활성화');
    }
  } catch (err) {
    console.log(`Wake Lock 에러: ${err.message}`); [cite_start]// [cite: 11]
  }
}

// ----------------------
[cite_start]// 4. 로그인 및 유닛 생성 [cite: 16-19]
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
      alert(`${data.name}님, 오늘도 화이팅!`);
      renderUnitButtons();
      [cite_start]showBox('unit-selector'); // 유닛 선택 화면으로 이동 [cite: 19]
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
  const unitButtonsContainer = document.getElementById("unit-buttons");
  unitButtonsContainer.innerHTML = ""; 
  const currentTitles = bookDatabase[currentType] || {};
  for (let i = 1; i <= 8; i++) {
    const btn = document.createElement("button");
    const titleText = currentTitles[i] ? `<br><span class="unit-title" style="font-size:12px; font-weight:normal; color:rgba(0,0,0,0.6);">${currentTitles[i]}</span>` : "";
    btn.innerHTML = `Unit ${i}${titleText}`;
    btn.onclick = () => selectUnit(i);
    unitButtonsContainer.appendChild(btn);
  }
}

// ----------------------
[cite_start]// 5. 메뉴 및 모드 제어 [cite: 20-27]
// ----------------------
window.selectUnit = async function (n) {
  currentUnit = n;
  const fileName = `${currentType}${currentUnit}.json`;
  const fullUrl = BASE_URL + currentType + "/" + fileName;

  try {
    const response = await fetch(fullUrl);
    currentData = await response.json();
    document.getElementById("menu-title").innerText = `Unit ${n} Menu`;
    showBox('menu-box'); // 유닛 선택 후 메뉴판 노출
  } catch (error) {
    alert("파일을 찾을 수 없습니다.");
  }
};

window.showMenu = () => { stopRepeatAudio(); showBox('menu-box'); };
window.goBackToUnits = () => showBox('unit-selector');
window.showDevPage = (name) => {
  document.getElementById('dev-title').innerText = name;
  showBox('dev-box');
};

// ----------------------
[cite_start]// 6. Script 학습 모드 [cite: 28-33]
// ----------------------
window.startScriptMode = () => {
  const phone = document.getElementById("phone-input").value.trim();
  const saveKey = `save_${phone}_unit${currentUnit}`;
  const savedData = localStorage.getItem(saveKey);
  index = 0; cycle = 1;
  if (savedData) {
    const parsed = JSON.parse(savedData);
    index = parsed.index; cycle = parsed.cycle; [cite_start]// [cite: 25]
  }
  updateProgress();
  showBox('study-box');
  document.getElementById("sentence").innerText = "Start 버튼을 눌러주세요";
  document.getElementById("sentence-kor").innerText = "";
};

window.startStudy = function () {
  document.getElementById("start-btn").innerText = "Listen again";
  document.getElementById("skip-btn").style.display = "inline-block";
  requestWakeLock(); // 학습 시작 시 화면 켜짐 방지
  playSentence();
};

function playSentence() {
  const sentenceText = document.getElementById("sentence");
  sentenceText.classList.remove("success", "fail");
  sentenceText.style.color = "#fff"; 
  const item = currentData[index];
  sentenceText.innerText = item.en;
  document.getElementById("sentence-kor").innerText = item.ko;
  updateProgress();

  player.src = BASE_URL + currentType + "/" + item.audio;
  player.play().catch(e => console.log(e));

  player.onended = () => {
    sentenceText.style.color = "#ffff00"; 
    try { recognizer.start(); } catch(e) {}
  };
}

// ----------------------
[cite_start]// 7. 음성 인식 및 50% 성공 체크 [cite: 34-44]
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
  const sText = document.getElementById("sentence");

  [cite_start]if (accuracy >= 0.5) { // 50% 통과 시 성공 [cite: 38]
    successSound.play().catch(e => {}); 
    sText.innerText = "Great!";
    sText.classList.add("success");
    sText.style.color = "#39ff14"; 
    setTimeout(nextStep, 600); 
  } else {
    failSound.play().catch(e => {}); 
    sText.innerText = "Try again";
    sText.classList.add("fail");
    sText.style.color = "#ff4b4b"; 
    setTimeout(playSentence, 600);
  }
};

window.nextStep = function() {
  try { recognizer.abort(); } catch(e) {}
  index++; 
  if (index >= currentData.length) { index = 0; cycle++; }
  const phone = document.getElementById("phone-input").value.trim();
  localStorage.setItem(`save_${phone}_unit${currentUnit}`, JSON.stringify({index, cycle}));
  sendDataToGoogle();
  if (cycle === totalCycles + 1) alert("🎉 100% 달성! 축하합니다!");
  playSentence();
};

// ----------------------
// 8. 반복 듣기 (2초 대기 + 강조)
// ----------------------
window.startRepeatMode = () => {
  showBox('repeat-box');
  const list = document.getElementById('repeat-list');
  list.innerHTML = "";
  currentData.forEach((item, idx) => {
    const div = document.createElement('div');
    div.className = 'repeat-item'; div.id = `repeat-${idx}`;
    div.innerHTML = `<div>${item.en}</div><div class="repeat-ko" style="font-size:13px; color:#888;">${item.ko}</div>`;
    list.appendChild(div);
  });
};

window.runRepeatAudio = async function() {
  const count = parseInt(document.getElementById('repeat-count').value) || 1;
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
    // 사이클 종료 후 2초 대기
    if (c < count - 1 && isRepeating) await new Promise(r => setTimeout(r, 2000));
  }
  isRepeating = false;
};

window.stopRepeatAudio = () => { isRepeating = false; player.pause(); };

// ----------------------
[cite_start]// 9. 진행률 및 데이터 전송 [cite: 45-53]
// ----------------------
function updateProgress() {
  if (!currentData.length) return;
  const currentCount = ((cycle - 1) * currentData.length) + index;
  const percent = Math.floor((currentCount / (totalCycles * currentData.length)) * 100);
  document.getElementById("progress-percent").innerText = percent + "%"; [cite_start]// [cite: 51]
  document.getElementById("progress").style.width = Math.min(percent, 100) + "%"; [cite_start]// [cite: 53]
}

function sendDataToGoogle() {
  const phone = document.getElementById("phone-input").value.trim();
  if (!GOOGLE_SCRIPT_URL.startsWith("http")) return;
  const currentCount = ((cycle - 1) * currentData.length) + index;
  const percent = Math.floor((currentCount / (totalCycles * currentData.length)) * 100);
  const data = { action: "save", phone: phone, unit: "Unit " + currentUnit, percent: percent };
  fetch(GOOGLE_SCRIPT_URL, { method: "POST", mode: "no-cors", body: JSON.stringify(data) });
}
