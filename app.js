/* ======================================================
   1. 글로벌 변수 및 데이터베이스
   ====================================================== */
const REPO_USER = "jaydo14"; 
const REPO_NAME = "english-app";
const BASE_URL = `https://raw.githubusercontent.com/${REPO_USER}/${REPO_NAME}/main/contents/`;
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby5LuGO79Gg3iBy6EL2_Ld2mPYbo_UbLdHMjJ3Q0POV29bsHKYy8Fc_j2A5zHhSO8XW/exec"; 

let currentTotalCycles = 18; 
let currentPart = "Script"; 
let userName = ""; 
let currentType = ""; 
let currentUnit = 1;
let currentData = []; 
let index = 0;
let cycle = 1;
let isRepeating = false;
let asTimer = null;
let asSeconds = 0;
let asData = null;
let isAlertShown = false; 

let mediaRecorder; 
let audioChunks = []; 
let recordingTimer; 
let recSeconds = 0; 
let modalCallback = null; 

const player = new Audio();
const successSound = new Audio(BASE_URL + "common/success.mp3");
const failSound = new Audio(BASE_URL + "common/fail.mp3");

// [검은 화면 방지] 시트의 hc12, fc21 코드와 정확히 매칭
const bookDatabase = {
  "hc12": { 1: "Music", 2: "Directions", 3: "Favorite beverage", 4: "Movies", 5: "Lunch", 6: "Vacation", 7: "New years", 8: "Switch lives" },
  "fc21": { 1: "Restaurant", 2: "Birthday", 3: "Expenses", 4: "Dream job", 5: "Movies", 6: "Eating healthy", 7: "Traveling alone", 8: "Education" }
};

/* ======================================================
   2. UI 관리 및 유닛 버튼 렌더링
   ====================================================== */
function showBox(boxId) {
  const boxes = ['login-box', 'unit-selector', 'menu-box', 'study-box', 'repeat-box', 'dev-box', 'as-box', 'results-box', 'as-record-box'];
  boxes.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = (id === boxId) ? 'block' : 'none';
  });
  window.scrollTo(0,0);
}

function showCustomModal(msg, callback = null) {
  player.pause(); 
  const modal = document.getElementById('custom-modal');
  if (modal) {
    document.getElementById('modal-msg').innerText = msg;
    modal.style.display = 'flex';
    modalCallback = callback; 
  } else {
    alert(msg); if(callback) callback();
  }
}

window.closeCustomModal = () => {
  document.getElementById('custom-modal').style.display = 'none';
  if (modalCallback) { modalCallback(); modalCallback = null; }
};

window.login = function () {
  const phoneInput = document.getElementById("phone-input");
  const inputVal = phoneInput.value.trim();
  if (!inputVal) return showCustomModal("번호를 입력하세요.");
  
  const loginBtn = document.querySelector("#login-box button");
  if(loginBtn) { loginBtn.disabled = true; loginBtn.innerText = "Checking..."; }

  fetch(`${GOOGLE_SCRIPT_URL}?phone=${inputVal}`)
    .then(res => res.json())
    .then(data => {
      if (data.result === "success") {
        userName = data.name; 
        currentType = data.type; // 예: "hc12"
        
        // [해결] 유닛 버튼 생성 로직 호출
        if (renderUnitButtons()) {
          showBox('unit-selector');
          showCustomModal(`${userName}님 환영합니다!`);
        } else {
          showCustomModal("교재 정보를 찾을 수 없습니다. (코드: " + currentType + ")");
        }
      } else {
        showCustomModal("등록되지 않은 번호입니다.");
        if(loginBtn) { loginBtn.disabled = false; loginBtn.innerText = "Login"; }
      }
    }).catch(() => {
      showCustomModal("서버 접속 오류가 발생했습니다.");
      if(loginBtn) { loginBtn.disabled = false; loginBtn.innerText = "Login"; }
    });
};

function renderUnitButtons() {
  const container = document.getElementById("unit-buttons");
  if (!container) return false;
  
  container.innerHTML = ""; 
  const currentTitles = bookDatabase[currentType];
  if (!currentTitles) return false;

  for (let i = 1; i <= 8; i++) {
    const btn = document.createElement("button");
    btn.className = "unit-btn";
    const title = currentTitles[i] ? `<br><span style="font-size:11px; font-weight:normal; color:#ccc;">${currentTitles[i]}</span>` : "";
    btn.innerHTML = `Unit ${i}${title}`;
    btn.onclick = () => { currentUnit = i; showBox('menu-box'); };
    container.appendChild(btn);
  }
  return true;
}

window.showMenu = () => { stopRepeatAudio(); if (asTimer) clearInterval(asTimer); showBox('menu-box'); };
window.goBackToUnits = () => showBox('unit-selector');

/* ======================================================
   3. 학습 엔진 (Script/Voca/Shake/Skip)
   ====================================================== */
window.startScriptMode = () => { currentPart = "Script"; currentTotalCycles = 18; loadStudyData(`${currentType}u${currentUnit}.json`); };
window.startVocaMode = () => { currentPart = "Voca"; currentTotalCycles = 10; loadStudyData(`${currentType}u${currentUnit}_voca.json`); };

async function loadStudyData(fileName) {
  isAlertShown = false; showBox('dev-box');
  try {
    const res = await fetch(BASE_URL + currentType + "u/" + fileName);
    currentData = await res.json();
    index = 0; cycle = 1;
    document.getElementById("start-btn").innerText = "Start";
    document.getElementById("skip-btn").style.display = "none";
    updateProgress(); showBox('study-box');
  } catch (e) { showCustomModal("데이터 로드 실패"); showMenu(); }
}

window.startStudy = () => {
  document.getElementById("start-btn").innerText = "Listen again";
  document.getElementById("skip-btn").style.display = "inline-block"; // 스킵 버튼 노출
  playSentence();
};

function playSentence() {
  const sText = document.getElementById("sentence");
  if (!sText) return;
  const item = currentData[index];
  sText.classList.remove("shake"); // 흔들림 초기화
  sText.innerText = item.en; sText.style.color = "#fff";
  document.getElementById("sentence-kor").innerText = item.ko;
  updateProgress();
  player.src = BASE_URL + currentType + "u/" + item.audio;
  player.play();
  player.onended = () => { sText.style.color = "#ffff00"; startRecognition(); };
}

window.skipSentence = () => { stopRecognition(); nextStep(); };

window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognizer = new SpeechRecognition();
recognizer.lang = "en-US";
recognizer.onresult = (event) => {
  const spoken = event.results[0][0].transcript.toLowerCase();
  const target = currentData[index].en.toLowerCase().replace(/[.,?!'"]/g, "");
  const sText = document.getElementById("sentence");
  if (spoken.includes(target) || target.includes(spoken)) {
    successSound.play(); sText.innerText = "Excellent!"; sText.style.color = "#39ff14";
    setTimeout(nextStep, 700);
  } else {
    failSound.play(); sText.innerText = "Try again"; sText.style.color = "#ff4b4b";
    // [해결] 흔들림 효과 애니메이션 강제 재실행
    sText.classList.remove("shake"); void sText.offsetWidth; sText.classList.add("shake");
    setTimeout(playSentence, 800);
  }
};
function startRecognition() { try { recognizer.start(); } catch(e) {} }
function stopRecognition() { try { recognizer.abort(); } catch(e) {} }

window.nextStep = function() {
  index++; if (index >= currentData.length) { index = 0; cycle++; }
  const percent = Math.floor((((cycle - 1) * currentData.length) + index) / (currentTotalCycles * currentData.length) * 100);
  sendDataToGoogle(currentPart, percent + "%");
  if (percent >= 100 && !isAlertShown) { 
    isAlertShown = true; 
    triggerFireworkConfetti(); 
    showCustomModal(`🎉 ${currentPart} 100% 달성!`, () => playSentence()); 
    return; 
  }
  playSentence();
};

/* ======================================================
   4. Accurate Speaking & Correction
   ====================================================== */
window.startAccurateSpeakingMode = async function() {
  const phone = document.getElementById("phone-input").value.trim(); showBox('dev-box');
  try {
    const res = await fetch(`${GOOGLE_SCRIPT_URL}?action=getAS&phone=${phone}&unit=Unit ${currentUnit}`);
    asData = await res.json();
    document.getElementById('student-text-input').value = ""; // 텍스트 초기화
    if (asData && asData.isSubmitted) { // 중복 제출 방지
      document.getElementById('as-q-text').innerText = "이미 전송된 과제입니다. ✔";
      showBox('as-record-box');
      document.getElementById('as-listen-btn').style.display = 'none';
      document.getElementById('recording-ui').style.display = 'none';
      document.getElementById('submit-ui').style.display = 'none';
      return;
    }
    document.getElementById('as-q-text').innerText = asData.question || "질문 정보 없음";
    showBox('as-record-box');
    document.getElementById('as-listen-btn').style.display = 'block';
    document.getElementById('recording-ui').style.display = 'none';
    document.getElementById('submit-ui').style.display = 'none';
  } catch (e) { showCustomModal("데이터 로드 실패"); showMenu(); }
};

window.submitAccurateSpeaking = async function() {
  const text = document.getElementById('student-text-input').value.trim();
  if (!text) return showCustomModal("내용을 입력해주세요.");
  showBox('dev-box');
  const payload = { action: "uploadAS", phone: document.getElementById("phone-input").value.trim(), unit: "Unit " + currentUnit, studentText: text, audioData: window.lastAudioBase64 };
  fetch(GOOGLE_SCRIPT_URL, { method: "POST", body: JSON.stringify(payload) })
    .then(res => res.json())
    .then(data => {
      if (data.result === "success") showCustomModal("성공적으로 제출되었습니다!", () => showMenu());
      else showCustomModal("제출 실패: " + data.message);
    }).catch(() => { showCustomModal("서버 오류: 배포 설정을 확인하세요."); showBox('as-record-box'); });
};

// [반복듣기 중단 후 다시 시작 로직]
window.runRepeatAudio = async function() {
  const count = parseInt(document.getElementById('repeat-count').value) || 3;
  const btn = document.getElementById('repeat-start-btn');
  isRepeating = true; btn.disabled = true; btn.innerText = "Playing...";
  for (let c = 0; c < count; c++) {
    for (let i = 0; i < currentData.length; i++) {
      if (!isRepeating) return;
      await new Promise(resolve => {
        document.querySelectorAll('.repeat-item').forEach(r => r.style.background = "transparent");
        const el = document.getElementById(`repeat-${i}`);
        if(el) { el.style.background = "#1a3a1a"; el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
        player.src = `${BASE_URL}${currentType}u/${currentData[i].audio}`; player.play();
        player.onended = resolve;
      });
    }
  }
  isRepeating = false; btn.disabled = false; btn.innerText = "Start";
};
window.stopRepeatAudio = () => { isRepeating = false; player.pause(); };

/* ======================================================
   5. 유틸리티 (Progress, 저장, Confetti)
   ====================================================== */
function updateProgress() {
  const currentCount = ((cycle - 1) * currentData.length) + index;
  const percent = Math.floor((currentCount / (currentTotalCycles * currentData.length)) * 100);
  document.getElementById("progress-percent").innerText = percent + "%";
  document.getElementById("progress").style.width = Math.min(percent, 100) + "%";
}

function sendDataToGoogle(part, val) {
  const phone = document.getElementById("phone-input").value.trim();
  fetch(GOOGLE_SCRIPT_URL, { method: "POST", mode: "no-cors", body: JSON.stringify({ action: "save", phone, unit: "Unit " + currentUnit, percent: val, part }) });
}

function triggerFireworkConfetti() {
  var duration = 4 * 1000; var animationEnd = Date.now() + duration;
  var interval = setInterval(function() { var timeLeft = animationEnd - Date.now(); if (timeLeft <= 0) return clearInterval(interval); confetti({ particleCount: 50, spread: 360, origin: { x: Math.random(), y: Math.random() - 0.2 } }); }, 250);
}
