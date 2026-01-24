const REPO_USER = "jaydo14"; 
const REPO_NAME = "english-app";
const BASE_URL = `https://raw.githubusercontent.com/${REPO_USER}/${REPO_NAME}/main/contents/`;
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby4tsK2iqumwsr9-BsBTYXeb_sFdBKBCwa0Vd1gMchYDryJ-dpSxinm5WDB2TjkkQ0d/exec"; 

const totalCycles = 18; 
const bookDatabase = {
  "hc12u": { 1: "Music", 2: "Directions", 3: "Favorite beverage", 4: "Movies", 5: "Lunch", 6: "Vacation", 7: "New years", 8: "Switch lives" },
  "fc21u": { 1: "Restaurant", 2: "Birthday", 3: "Expenses", 4: "Dream job", 5: "Movies", 6: "Eating healthy", 7: "Traveling", 8: "Education" }
};

const loginBox = document.getElementById("login-box");
const app = document.getElementById("app");
const unitButtonsContainer = document.getElementById("unit-buttons");
const phoneInput = document.getElementById("phone-input");
const menuBox = document.getElementById("menu-box");
const studyBox = document.getElementById("study-box");
const repeatBox = document.getElementById("repeat-box");
const allBoxes = [loginBox, menuBox, studyBox, repeatBox];

const sentenceText = document.getElementById("sentence");
const sentenceKor = document.getElementById("sentence-kor");
const progressBar = document.getElementById("progress");
const progressPercent = document.getElementById("progress-percent");
const repeatList = document.getElementById("repeat-list");
const repeatCountInput = document.getElementById("repeat-count");

let currentType = ""; 
let currentUnit = 1;
let currentData = []; 
let index = 0;
let cycle = 1;
let isRepeating = false;
const player = new Audio(); 

function showBox(targetBox) {
  allBoxes.forEach(box => { if(box) box.style.display = "none"; });
  document.querySelectorAll('.box').forEach(b => b.style.display = 'none');
  if(targetBox) {
    targetBox.style.display = "block";
    app.style.display = "block";
  }
}

window.login = function () {
  const val = phoneInput.value.trim();
  if (!val) return alert("번호 입력!");
  fetch(GOOGLE_SCRIPT_URL + "?phone=" + val)
  .then(res => res.json())
  .then(data => {
    if (data.result === "success") {
      currentType = data.type;
      renderUnitButtons();
      loginBox.style.display = "none";
      app.style.display = "block";
      unitButtonsContainer.parentElement.style.display = "block";
    } else alert("등록되지 않은 번호입니다.");
  });
};

function renderUnitButtons() {
  unitButtonsContainer.innerHTML = ""; 
  for (let i = 1; i <= 8; i++) {
    const btn = document.createElement("button");
    btn.innerHTML = `Unit ${i}`;
    btn.onclick = () => selectUnit(i);
    unitButtonsContainer.appendChild(btn);
  }
}

window.selectUnit = async function (n) {
  currentUnit = n;
  const url = `${BASE_URL}${currentType}/${currentType}${n}.json`;
  try {
    const res = await fetch(url);
    currentData = await res.json();
    document.getElementById("menu-title").innerText = `Unit ${n}`;
    showMenu();
  } catch (e) { alert("파일 오류!"); }
};

window.showMenu = () => {
  unitButtonsContainer.parentElement.style.display = "none";
  showBox(menuBox);
};

// 반복 듣기 모드 (번호 제거 버전)
window.startRepeatMode = function() {
  showBox(repeatBox);
  isRepeating = false;
  repeatList.innerHTML = "";
  currentData.forEach((item) => {
    const div = document.createElement("div");
    div.className = "repeat-item"; 
    div.innerHTML = `
      <div style="color:var(--primary); font-weight:700; font-size:18px;">${item.en}</div>
      <div style="color:var(--text-dim); font-size:14px; margin-top:4px;">${item.ko}</div>
    `;
    repeatList.appendChild(div);
  });
};

window.runRepeatAudio = async function() {
  if (isRepeating) return;
  const count = parseInt(repeatCountInput.value) || 3;
  isRepeating = true;
  const btn = document.getElementById("repeat-play-btn");
  btn.innerText = "재생 중...";

  for (let c = 1; c <= count; c++) {
    if (!isRepeating) break;
    for (let i = 0; i < currentData.length; i++) {
      if (!isRepeating) break;
      await playAudioPromise(currentData[i].audio, i);
    }
    if (c < count && isRepeating) await new Promise(r => setTimeout(r, 2000)); // 2초 대기
  }
  isRepeating = false;
  btn.innerText = "반복 시작";
};

// ⭐ 재생 중인 문장 네모 박스 표시 함수
function playAudioPromise(file, idx) {
  return new Promise((resolve) => {
    const items = repeatList.children;
    // 이전 강조 제거 후 현재 문장 강조
    Array.from(items).forEach(item => item.classList.remove("playing"));
    if (items[idx]) {
      items[idx].classList.add("playing");
      items[idx].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    player.src = `${BASE_URL}${currentType}/${file}`;
    player.play().then(() => {
      player.onended = () => resolve();
    }).catch(() => resolve());
  });
}

window.stopRepeatAudio = () => {
  isRepeating = false;
  player.pause();
  document.getElementById("repeat-play-btn").innerText = "반복 시작";
};
