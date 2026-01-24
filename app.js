// ======================================================
// 1. 기본 설정 및 상수
// ======================================================
const REPO_USER = "jaydo14"; 
const REPO_NAME = "english-app";
const BASE_URL = `https://raw.githubusercontent.com/${REPO_USER}/${REPO_NAME}/main/contents/`;
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby4tsK2iqumwsr9-BsBTYXeb_sFdBKBCwa0Vd1gMchYDryJ-dpSxinm5WDB2TjkkQ0d/exec"; 

const totalCycles = 18; // 100% 달성 기준

const bookDatabase = {
  "hc12u": { 1: "Music", 2: "Directions", 3: "Favorite beverage and snack", 4: "Where you like to watch movies", 5: "Lunch", 6: "Vacation", 7: "New years", 8: "Switch lives" },
  "fc21u": { 1: "Restaurant", 2: "Birthday", 3: "Expenses", 4: "Dream job", 5: "Movies", 6: "Eating healthy", 7: "Traveling alone", 8: "Education" }
};

// ----------------------
// 2. 변수 및 요소 가져오기
// ----------------------
const loginBox = document.getElementById("login-box");
const app = document.getElementById("app");
const studyBox = document.getElementById("study-box");
const unitButtonsContainer = document.getElementById("unit-buttons");
const sentenceText = document.getElementById("sentence");
const sentenceKor = document.getElementById("sentence-kor");
const progressBar = document.getElementById("progress");
const progressPercent = document.getElementById("progress-percent");
const phoneInput = document.getElementById("phone-input");
const startBtn = document.getElementById("start-btn");
const skipBtn = document.getElementById("skip-btn");

let currentType = ""; 
let currentUnit = 1;
let currentData = []; 
let index = 0;
let cycle = 1;
const player = new Audio();
let wakeLock = null; 

// 3. 화면 꺼짐 방지
async function requestWakeLock() {
  try { if ('wakeLock' in navigator) { wakeLock = await navigator.wakeLock.request('screen'); } }
  catch (err) { console.log(`${err.name}, ${err.message}`); }
}

// 4. 버튼 생성
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

// 5. 로그인
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
      loginBox.style.display = "none";
      app.style.display = "block";
    } else {
      alert("등록되지 않은 번호입니다.");
      loginBtn.disabled = false;
      loginBtn.innerText = "Login";
    }
  }).catch(() => { alert("접속 오류!"); loginBtn.disabled = false; });
};

// 6. 유닛 선택
window.selectUnit = async function (n) {
  currentUnit = n;
  const fileName = `${currentType}${currentUnit}.json`;
  const fullUrl = BASE_URL + currentType + "/" + fileName;

  studyBox.style.display = "block";
  document.querySelector('.box:not(#study-box)').style.display = 'none';
  sentenceText.innerText = "Loading...";

  try {
    const response = await fetch(fullUrl);
    currentData = await response.json();
    const saveKey = `save_${phoneInput.value.trim()}_unit${currentUnit}`;
    const savedData = localStorage.getItem(saveKey);
    index = 0; cycle = 1;
    if (savedData) {
      const parsed = JSON.parse(savedData);
      index = parsed.index; cycle = parsed.cycle;
    }
    updateProgress();
    sentenceText.innerText = "Start 버튼을 눌러주세요";
  } catch (error) {
    alert(`[오류] 파일을 찾을 수 없습니다.`);
    studyBox.style.display = "none";
    document.querySelector('.box:not(#study-box)').style.display = 'block';
  }
};

// 7. 학습 시작
window.startStudy = function () {
  if (startBtn) startBtn.innerText = "Listen again";
  if (skipBtn) skipBtn.style.display = "inline-block";
  requestWakeLock();
  playSentence();
};

// 8. 재생 및 표시
function playSentence() {
  sentenceText.classList.remove("success", "fail");
  sentenceText.style.color = "#fff"; 
  const item = currentData[index];
  sentenceText.innerText = item.en;
  sentenceKor.innerText = item.ko;
  updateProgress();

  if (item.audio) {
    player.src = BASE_URL + currentType + "/" + item.audio;
    player.play().catch(e => console.log("재생 오류", e));
  }
  player.onended = () => {
    sentenceText.style.color = "#ffff00"; 
    try { recognizer.start(); } catch(e) {}
  };
}

// 9. 음성 인식
window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognizer = new SpeechRecognition();
recognizer.lang = "en-US";

recognizer.onresult = (event) => {
  const spokenText = event.results[0][0].transcript;
  const clean = (str) => str.toLowerCase().replace(/[.,?!'"]/g, "").trim();
  const userWords = clean(spokenText).split(/\s+/); 
  const targetWords = clean(currentData[index].en).split(/\s+/);
  let matchCount = 0;
  targetWords.forEach(word => { if (userWords.includes(word)) matchCount++; });

  if (matchCount / targetWords.length >= 0.5) {
    sentenceText.innerText = "Great!";
    sentenceText.classList.add("success");
    sentenceText.style.color = "#39ff14"; 
    setTimeout(nextStep, 500); 
  } else {
    sentenceText.innerText = "Try again";
    sentenceText.classList.add("fail");
    sentenceText.style.color = "#ff4b4b"; 
    setTimeout(() => { playSentence(); }, 500);
  }
};

// 10. 다음 단계
window.nextStep = function() {
  try { recognizer.abort(); } catch(e) {}
  index++; 
  const saveKey = `save_${phoneInput.value.trim()}_unit${currentUnit}`;
  if (index >= currentData.length) { index = 0; cycle++; }
  localStorage.setItem(saveKey, JSON.stringify({ index, cycle }));
  sendDataToGoogle();
  if (cycle === totalCycles + 1) alert("🎉 100% 달성! 축하합니다!");
  playSentence();
};

// 11. 진행률 및 데이터 전송
function updateProgress() {
  const total = totalCycles * currentData.length;
  const current = ((cycle - 1) * currentData.length) + index;
  const percent = Math.floor((current / total) * 100);
  progressPercent.innerText = percent + "%";
  progressBar.style.width = Math.min(percent, 100) + "%";
}

function sendDataToGoogle() {
  const total = totalCycles * currentData.length;
  const current = ((cycle - 1) * currentData.length) + index;
  const percent = Math.floor((current / total) * 100);
  const data = { action: "save", phone: phoneInput.value.trim(), unit: "Unit " + currentUnit, percent: percent };
  fetch(GOOGLE_SCRIPT_URL, { method: "POST", mode: "no-cors", body: JSON.stringify(data) });
}
