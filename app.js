// ======================================================
// 1. 기본 설정 및 상수 [cite: 1-4]
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

// ----------------------
// 2. 변수 및 오디오 설정 [cite: 5-9]
// ----------------------
let currentType = ""; 
let currentUnit = 1;
let currentData = []; 
let index = 0;
let cycle = 1;
let isRepeating = false;
const player = new Audio();
let wakeLock = null; // 화면 꺼짐 방지 변수 [cite: 9]

// 효과음 설정
const successSound = new Audio(BASE_URL + "common/success.mp3");
const failSound = new Audio(BASE_URL + "common/fail.mp3");

// ----------------------
// 3. 화면 관리 및 꺼짐 방지 로직 
// ----------------------
function showBox(boxId) {
  const boxes = ['login-box', 'unit-selector', 'menu-box', 'study-box', 'repeat-box', 'dev-box'];
  boxes.forEach(id => {
    const el = document.getElementById(id);
    if(el) el.style.display = (id === boxId) ? 'block' : 'none';
  });
  document.getElementById("app").style.display = "block";
}

// ⭐ [복구] 화면 꺼짐 방지 함수 [cite: 9-11]
async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
      console.log('Wake Lock 활성화');
    }
  } catch (err) {
    console.log(`Wake Lock 에러: ${err.name}, ${err.message}`); [cite: 11]
  }
}

// 화면이 다시 보일 때 다시 활성화 [cite: 12]
document.addEventListener('visibilitychange', async () => {
  if (wakeLock !== null && document.visibilityState === 'visible') {
    await requestWakeLock();
  }
});

// ----------------------
// 4. 로그인 및 유닛 생성 [cite: 13-19]
// ----------------------
window.login = function () {
  const phoneInput = document.getElementById("phone-input");
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
      alert(`${data.name}님, 🔥오늘도 화이팅!🔥`); [cite: 18]
      renderUnitButtons();
      showBox('unit-selector');
    } else {
      alert("등록되지 않은 번호입니다."); [cite: 19]
      loginBtn.disabled = false;
      loginBtn.innerText = "Login";
    }
  }).catch(() => { alert("접속 오류!"); loginBtn.disabled = false; });
};

function renderUnitButtons() {
  const container = document.getElementById("unit-buttons");
  container.innerHTML = ""; 
  const currentTitles = bookDatabase[currentType] || {};
  for (let i = 1; i <= 8; i++) {
    const btn = document.createElement("button");
    const titleText = currentTitles[i] ? `<br><span class="unit-title" style="font-size:12px; font-weight:normal; color:rgba(0,0,0,0.6);">${currentTitles[i]}</span>` : ""; [cite: 15]
    btn.innerHTML = `Unit ${i}${titleText}`;
    btn.onclick = () => selectUnit(i);
    container.appendChild(btn);
  }
}

// ----------------------
// 5. 유닛 선택 및 메뉴 [cite: 20-27]
// ----------------------
window.selectUnit = async function (n) {
  currentUnit = n;
  const fileName = `${currentType}${currentUnit}.json`;
  const fullUrl = BASE_URL + currentType + "/" + fileName; [cite: 21]

  try {
    const response = await fetch(fullUrl);
    currentData = await response.json(); [cite: 23]
    document.getElementById("menu-title").innerText = `Unit ${n} Menu`;
    showBox('menu-box'); 
  } catch (error) {
    alert(`[오류] 파일을 찾을 수 없습니다.`); [cite: 27]
  }
};

window.showMenu = () => { stopRepeatAudio(); showBox('menu-box'); };
window.goBackToUnits = () => showBox('unit-selector');
window.showDevPage = (name) => {
  document.getElementById('dev-title').innerText = name;
  showBox('dev-box');
};

// ----------------------
// 6. Script 학습 모드 [cite: 28-33]
// ----------------------
window.startScriptMode = () => {
  const phoneInput = document.getElementById("phone-input");
  const saveKey = `save_${phoneInput.value.trim()}_unit${currentUnit}`;
  const savedData = localStorage.getItem(saveKey); [cite: 24]
  index = 0; cycle = 1;
  if (savedData) {
    const parsed = JSON.parse(savedData);
    index = parsed.index; cycle = parsed.cycle; [cite: 25]
  }
  updateProgress();
  showBox('study-box');
  document.getElementById("sentence").innerText = "Start 버튼을 눌러주세요";
  document.getElementById("sentence-kor").innerText = "";
};

window.startStudy = function () {
  document.getElementById("start-btn").innerText = "Listen again";
  document.getElementById("skip-btn").style.display = "inline-block"; [cite: 29]
  requestWakeLock(); // ⭐ 학습 시작 시 화면 꺼짐 방지 활성화 
  playSentence();
};

function playSentence() {
  const sentenceText = document.getElementById("sentence");
  const sentenceKor = document.getElementById("sentence-kor");
  sentenceText.classList.remove("success", "fail");
  sentenceText.style.color = "#fff"; [cite: 30]
  const item = currentData[index];
  sentenceText.innerText = item.en;
  sentenceKor.innerText = item.ko; [cite: 30]
  updateProgress();

  if (item.audio) {
    player.src = BASE_URL + currentType + "/" + item.audio; [cite: 31]
    player.play().catch(e => console.log(e));
  }
  player.onended = () => {
    sentenceText.style.color = "#ffff00"; [cite: 33]
    try { recognizer.start(); } catch(e) {}
  };
}

// ----------------------
// 7. 음성 인식 및 정확도 (50%) [cite: 34-39]
// ----------------------
window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognizer = new SpeechRecognition();
recognizer.lang = "en-US"; [cite: 35]

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

  if (accuracy >= 0.5) { // 50% 성공 로직 [cite: 38]
    successSound.play().catch(e => {}); 
    sentenceText.innerText = "Great!";
    sentenceText.classList.add("success");
    sentenceText.style.color = "#39ff14"; [cite: 38]
    setTimeout(nextStep, 500); 
  } else {
    failSound.play().catch(e => {}); 
    sentenceText.innerText = "Try again";
    sentenceText.classList.add("fail");
    sentenceText.style.color = "#ff4b4b"; [cite: 39]
    setTimeout(playSentence, 500);
  }
};

window.nextStep = function() {
  try { recognizer.abort(); } catch(e) {}
  index++; 
  const phoneInput = document.getElementById("phone-input");
  const userPhone = phoneInput.value.trim();
  const saveKey = `save_${userPhone}_unit${currentUnit}`; [cite: 40]
  if (index >= currentData.length) { index = 0; cycle++; }
  localStorage.setItem(saveKey, JSON.stringify({index, cycle})); [cite: 41]
  sendDataToGoogle();
  if (cycle === totalCycles + 1) alert("🎉 100% 달성! 축하합니다!"); [cite: 43]
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
  requestWakeLock(); // ⭐ 반복 재생 중에도 화면 꺼짐 방지
  
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
// 9. 진행률 및 구글 전송 [cite: 45-53]
// ----------------------
function getGlobalProgress() {
  if (!currentData.length) return 0; [cite: 45]
  const currentCount = ((cycle - 1) * currentData.length) + index; [cite: 46]
  return Math.floor((currentCount / (totalCycles * currentData.length)) * 100); [cite: 47]
}

function updateProgress() {
  const percent = getGlobalProgress();
  document.getElementById("progress-percent").innerText = percent + "%"; [cite: 51]
  document.getElementById("progress").style.width = Math.min(percent, 100) + "%"; [cite: 53]
}

function sendDataToGoogle() {
  const phoneInput = document.getElementById("phone-input");
  if (!GOOGLE_SCRIPT_URL.startsWith("http")) return; [cite: 48]
  const data = { action: "save", phone: phoneInput.value.trim(), unit: "Unit " + currentUnit, percent: getGlobalProgress() }; [cite: 49]
  fetch(GOOGLE_SCRIPT_URL, { method: "POST", mode: "no-cors", body: JSON.stringify(data) }); [cite: 50]
}
