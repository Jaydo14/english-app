// ======================================================
// 1. 기본 설정 및 상수
// ======================================================
const REPO_USER = "jaydo14"; 
const REPO_NAME = "english-app";
const BASE_URL = `https://raw.githubusercontent.com/${REPO_USER}/${REPO_NAME}/main/contents/`;
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby4tsK2iqumwsr9-BsBTYXeb_sFdBKBCwa0Vd1gMchYDryJ-dpSxinm5WDB2TjkkQ0d/exec"; 

const totalCycles = 18; 

// [수정] 오타가 나기 쉬운 객체 구조를 깔끔하게 정리했습니다.
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

// 효과음 설정 (contents/common/ 폴더에 업로드하신 파일)
const successSound = new Audio(BASE_URL + "common/success.mp3");
const failSound = new Audio(BASE_URL + "common/fail.mp3");

// ----------------------
// 2. 화면 관리 함수
// ----------------------
function showBox(boxId) {
  const boxes = ['login-box', 'unit-selector', 'menu-box', 'study-box', 'repeat-box', 'dev-box'];
  boxes.forEach(id => {
    const el = document.getElementById(id);
    if(el) el.style.display = (id === boxId) ? 'block' : 'none';
  });
  document.getElementById("app").style.display = "block";
}

// ----------------------
// 3. 로그인 및 유닛 선택
// ----------------------
window.login = function () {
  const phoneVal = document.getElementById("phone-input").value.trim();
  if (phoneVal.length < 1) return alert("번호를 입력해주세요.");
  
  const loginBtn = document.querySelector("#login-box button");
  loginBtn.disabled = true;
  loginBtn.innerText = "Checking...";

  fetch(GOOGLE_SCRIPT_URL + "?phone=" + phoneVal)
  .then(res => res.json())
  .then(data => {
    if (data.result === "success") {
      currentType = data.type;
      alert(`${data.name}님, 🔥오늘도 화이팅!🔥`);
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
  const container = document.getElementById("unit-buttons");
  container.innerHTML = ""; 
  for (let i = 1; i <= 8; i++) {
    const btn = document.createElement("button");
    btn.innerHTML = `Unit ${i}`;
    btn.onclick = () => selectUnit(i);
    container.appendChild(btn);
  }
}

window.selectUnit = async function (n) {
  currentUnit = n;
  const url = `${BASE_URL}${currentType}/${currentType}${n}.json`;
  try {
    const res = await fetch(url);
    currentData = await res.json();
    document.getElementById("menu-title").innerText = `Unit ${n} Menu`;
    showBox('menu-box');
  } catch (e) { alert("파일을 찾을 수 없습니다."); }
};

window.showMenu = () => { stopRepeatAudio(); showBox('menu-box'); };
window.goBackToUnits = () => showBox('unit-selector');
window.showDevPage = (name) => { document.getElementById('dev-title').innerText = name; showBox('dev-box'); };

// ----------------------
// 4. Script 학습 (50% 인식 로직)
// ----------------------
window.startScriptMode = () => {
  const phone = document.getElementById("phone-input").value.trim();
  const saved = localStorage.getItem(`save_${phone}_unit${currentUnit}`);
  index = 0; cycle = 1;
  if (saved) { const p = JSON.parse(saved); index = p.index; cycle = p.cycle; }
  updateProgress();
  showBox('study-box');
  document.getElementById("sentence").innerText = "Start 버튼을 눌러주세요";
  document.getElementById("sentence-kor").innerText = "";
};

window.startStudy = () => {
  document.getElementById("start-btn").innerText = "Listen again";
  document.getElementById("skip-btn").style.display = "inline-block";
  playSentence();
};

function playSentence() {
  const sText = document.getElementById("sentence");
  sText.classList.remove("success", "fail");
  sText.style.color = "#fff";
  const item = currentData[index];
  sText.innerText = item.en;
  document.getElementById("sentence-kor").innerText = item.ko;
  updateProgress();

  player.src = BASE_URL + currentType + "/" + item.audio;
  player.play();
  player.onended = () => { sText.style.color = "#ffff00"; try { recognizer.start(); } catch(e) {} };
}

window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognizer = new SpeechRecognition();
recognizer.lang = "en-US";
recognizer.onresult = (event) => {
  const spoken = event.results[0][0].transcript;
  const clean = (str) => str.toLowerCase().replace(/[.,?!'"]/g, "").trim();
  const userWords = clean(spoken).split(/\s+/);
  const targetWords = clean(currentData[index].en).split(/\s+/);
  
  let matches = 0;
  targetWords.forEach(w => { if (userWords.includes(w)) matches++; });

  if (matches / targetWords.length >= 0.5) { // 50% 성공
    successSound.play();
    document.getElementById("sentence").innerText = "Great!";
    document.getElementById("sentence").classList.add("success");
    setTimeout(nextStep, 700);
  } else {
    failSound.play();
    document.getElementById("sentence").classList.add("fail");
    setTimeout(playSentence, 800);
  }
};

window.nextStep = () => {
  try { recognizer.abort(); } catch(e) {}
  index++;
  if (index >= currentData.length) { index = 0; cycle++; }
  const phone = document.getElementById("phone-input").value.trim();
  localStorage.setItem(`save_${phone}_unit${currentUnit}`, JSON.stringify({index, cycle}));
  sendDataToGoogle();
  playSentence();
};

// ----------------------
// 5. 반복 듣기 (2초 대기)
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
        player.src = BASE_URL + currentType + "/" + currentData[i].audio;
        player.play(); player.onended = () => resolve();
      });
    }
    if (c < count - 1 && isRepeating) await new Promise(r => setTimeout(r, 2000));
  }
  isRepeating = false;
};

window.stopRepeatAudio = () => { isRepeating = false; player.pause(); };

function updateProgress() {
  if (!currentData.length) return;
  const percent = Math.floor((((cycle - 1) * currentData.length) + index) / (totalCycles * currentData.length) * 100);
  document.getElementById("progress-percent").innerText = percent + "%";
  document.getElementById("progress").style.width = Math.min(percent, 100) + "%";
}

function sendDataToGoogle() {
  const phone = document.getElementById("phone-input").value.trim();
  const data = { action: "save", phone: phone, unit: "Unit " + currentUnit, percent: document.getElementById("progress-percent").innerText.replace("%","") };
  fetch(GOOGLE_SCRIPT_URL, { method: "POST", mode: "no-cors", body: JSON.stringify(data) });
}
