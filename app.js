// ======================================================
// 1. 기본 설정 및 상수 영역 (교재 코드: hc12, fc21로 변경)
// ======================================================
const REPO_USER = "jaydo14"; 
const REPO_NAME = "english-app";
const BASE_URL = `https://raw.githubusercontent.com/${REPO_USER}/${REPO_NAME}/main/contents/`;
// 사용자님의 최신 구글 스크립트 URL
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwk4c5JBHkWj9aZ4LxHocVgvPn9-uoYexKJY3J8CcgDYIstC4WC-oJUgD2MJ_jRav8p/exec"; 

let currentTotalCycles = 18; 
let currentPart = "Script"; 
let userName = ""; // 사용자 이름 저장

const bookDatabase = {
  "hc12": { 1: "Music", 2: "Directions", 3: "Favorite beverage", 4: "Movies", 5: "Lunch", 6: "Vacation", 7: "New years", 8: "Switch lives" },
  "fc21": { 1: "Restaurant", 2: "Birthday", 3: "Expenses", 4: "Dream job", 5: "Movies", 6: "Eating healthy", 7: "Traveling alone", 8: "Education" }
};

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
let wakeLock = null;

// AS 전용 변수
let asTimer = null;
let asSeconds = 0;
let asData = null;

const successSound = new Audio(BASE_URL + "common/success.mp3");
const failSound = new Audio(BASE_URL + "common/fail.mp3");

// ----------------------
// 3. 화면 관리 및 유틸리티
// ----------------------
function showBox(boxId) {
  const boxes = ['login-box', 'unit-selector', 'menu-box', 'study-box', 'repeat-box', 'dev-box', 'as-box', 'results-box'];
  boxes.forEach(id => {
    const el = document.getElementById(id);
    if(el) el.style.display = (id === boxId) ? 'block' : 'none';
  });
  const appContainer = document.getElementById("app");
  if(appContainer) appContainer.style.display = "block";
}

async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) { wakeLock = await navigator.wakeLock.request('screen'); }
  } catch (err) { console.log(err); }
}

// ----------------------
// 4. 로그인 및 유닛 생성
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
      userName = data.name;
      alert(`${userName}님, 🔥오늘도 화이팅 입니다!🔥`);
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
  if(!container) return;
  container.innerHTML = ""; 
  const currentTitles = bookDatabase[currentType] || {};
  for (let i = 1; i <= 8; i++) {
    const btn = document.createElement("button");
    const titleText = currentTitles[i] ? `<br><span class="unit-title" style="font-size:12px; font-weight:normal; color:rgba(0,0,0,0.6);">${currentTitles[i]}</span>` : "";
    btn.innerHTML = `Unit ${i}${titleText}`;
    btn.onclick = () => { currentUnit = i; showBox('menu-box'); };
    container.appendChild(btn);
  }
}

window.showMenu = () => { stopRepeatAudio(); clearInterval(asTimer); showBox('menu-box'); };
window.goBackToUnits = () => showBox('unit-selector');

// ----------------------
// 5. AS Correction (My Answer / Feedback / 폰트 축소 반영)
// ----------------------
window.startASMode = async function() {
  currentPart = "AS Correction";
  const phone = document.getElementById("phone-input").value.trim();
  
  showBox('dev-box');
  document.getElementById('dev-title').innerText = "Loading...";
  document.getElementById('dev-msg').innerText = "잠시만 기다려주세요.☕";

  const url = `${GOOGLE_SCRIPT_URL}?action=getAS&phone=${phone}&unit=Unit ${currentUnit}`;

  try {
    const res = await fetch(url);
    asData = await res.json();
    if (!asData || !asData.question) throw new Error();
    
    renderASPage();
    showBox('as-box');
  } catch (e) {
    alert("아직 등록된 첨삭 내용이 없습니다. 선생님께 확인해 보세요!");
    showMenu();
  }
};

function renderASPage() {
  const container = document.getElementById('as-box');
  const formatText = (text) => text.replace(/\[(.*?)\]/g, '<span style="color:#ff4b4b; font-weight:bold;">$1</span>');

  container.innerHTML = `
    <h2 style="margin-bottom:20px; color:#39ff14;">AS Correction</h2>
    <div style="text-align:left; margin-bottom:15px; border-bottom:1px solid #333; padding-bottom:10px;">
      <p style="color:#39ff14; font-size:14px; margin-bottom:5px;">[Teacher's Question]</p>
      <p style="font-size:18px; line-height:1.4;">${asData.question}</p>
    </div>

    <div style="text-align:left; background:#222; padding:15px; border-radius:12px; margin-bottom:10px;">
      <p style="color:#888; font-size:12px; margin-bottom:5px;">My Answer</p>
      <p style="color:#aaa; font-style:italic; font-size:15px;">${asData.original}</p>
    </div>

    <div style="text-align:left; background:#222; padding:15px; border-radius:12px; margin-bottom:20px;">
      <p style="color:#39ff14; font-size:12px; margin-bottom:5px;">Feedback</p>
      <p style="font-size:17px; line-height:1.4;">${formatText(asData.corrected)}</p>
    </div>

    <div id="as-timer" style="font-size:28px; margin-bottom:20px; color:#39ff14; font-family:monospace; font-weight:bold;">00:00</div>
    
    <button id="as-start-btn" onclick="startASStudy()" style="width: 95%;">Start</button>
    
    <div id="as-controls" style="display:none; flex-direction:column; align-items:center; gap:10px; width:100%;">
      <button onclick="playASAudio()" style="background:#555; width:95%;">질문 다시듣기</button>
      <button onclick="finishASStudy()" style="background:#39ff14; color:#000; width:95%;">학습 완료</button>
    </div>

    <div style="width:100%; display:flex; justify-content:center; margin-top:15px;">
      <button onclick="showMenu()" class="sub-action-btn" style="width:65% !important;">Back to Menu</button>
    </div>
  `;
}

window.startASStudy = function() {
  document.getElementById('as-start-btn').style.display = 'none';
  document.getElementById('as-controls').style.display = 'flex';
  requestWakeLock();
  asSeconds = 0;
  asTimer = setInterval(() => {
    asSeconds++;
    const m = Math.floor(asSeconds / 60).toString().padStart(2, '0');
    const s = (asSeconds % 60).toString().padStart(2, '0');
    document.getElementById('as-timer').innerText = `${m}:${s}`;
  }, 1000);
  playASAudio();
};

window.playASAudio = function() {
  player.src = BASE_URL + currentType + "/" + asData.audio;
  player.play().catch(e => alert("음원 파일을 찾을 수 없습니다."));
};

window.finishASStudy = function() {
  clearInterval(asTimer);
  const m = Math.floor(asSeconds / 60);
  const s = asSeconds % 60;
  sendDataToGoogle("AS Correction", `${m}분 ${s}초`);
  alert(`${userName}님, Have a good day❤`);
  showMenu();
};

// ----------------------
// 6. 학습 모드 기능 (Script / Vocab)
// ----------------------
window.startScriptMode = async function() {
  currentPart = "Script"; currentTotalCycles = 18;
  loadStudyData(`${currentType}${currentUnit}.json`, "script");
};

window.startVocaMode = async function() {
  currentPart = "Voca"; currentTotalCycles = 10;
  loadStudyData(`${currentType}${currentUnit}_voca.json`, "voca");
};

async function loadStudyData(fileName, suffix) {
  try {
    const res = await fetch(BASE_URL + currentType + "/" + fileName);
    currentData = await res.json();
    const phone = document.getElementById("phone-input").value.trim();
    const saved = localStorage.getItem(`save_${phone}_unit${currentUnit}_${suffix}`);
    index = 0; cycle = 1;
    if (saved) { const p = JSON.parse(saved); index = p.index; cycle = p.cycle; }
    updateProgress();
    showBox('study-box');
  } catch (e) { alert("파일을 찾을 수 없습니다."); }
}

window.startStudy = function () {
  const startBtn = document.getElementById("start-btn");
  if(startBtn) startBtn.innerText = "Listen again";
  const skipBtn = document.getElementById("skip-btn");
  if(skipBtn) skipBtn.style.display = "inline-block";
  requestWakeLock();
  playSentence();
};

function playSentence() {
  const sText = document.getElementById("sentence");
  if(!sText) return;
  sText.classList.remove("success", "fail");
  sText.style.color = "#fff";
  const item = currentData[index];
  // 영어 문장 폰트 크기 18px로 조정
  sText.innerText = item.en;
  sText.style.fontSize = "18px"; 
  const sentenceKor = document.getElementById("sentence-kor");
  if(sentenceKor) {
    sentenceKor.innerText = item.ko;
    sentenceKor.style.fontSize = "15px";
  }
  updateProgress();
  player.src = BASE_URL + currentType + "/" + item.audio;
  player.play();
  player.onended = () => {
    sText.style.color = "#ffff00";
    try { recognizer.start(); } catch(e) {}
  };
}

// ----------------------
// 7. 음성 인식 및 정확도
// ----------------------
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
  const accuracy = matches / targetWords.length;
  const sText = document.getElementById("sentence");

  if (accuracy >= 0.6) { 
    successSound.play().catch(e => {}); 
    const praiseList = ["Great!", "Excellent!", "Perfect!", "Well done!", "Amazing!"];
    const randomPraise = praiseList[Math.floor(Math.random() * praiseList.length)];
    if(sText) { sText.innerText = randomPraise; sText.classList.add("success"); sText.style.color = "#39ff14"; }
    setTimeout(nextStep, 700); 
  } else {
    failSound.play().catch(e => {}); 
    if(sText) { sText.innerText = "Try again"; sText.classList.add("fail"); sText.style.color = "#ff4b4b"; }
    setTimeout(playSentence, 800); 
  }
};

window.nextStep = function() {
  try { recognizer.abort(); } catch(e) {}
  index++; 
  if (index >= currentData.length) { index = 0; cycle++; }
  const phone = document.getElementById("phone-input").value.trim();
  const suffix = currentPart === "Voca" ? "voca" : "script";
  localStorage.setItem(`save_${phone}_unit${currentUnit}_${suffix}`, JSON.stringify({index, cycle}));
  const currentCount = ((cycle - 1) * currentData.length) + index;
  const percent = Math.floor((currentCount / (currentTotalCycles * currentData.length)) * 100);
  sendDataToGoogle(currentPart, percent + "%"); 
  playSentence();
};

// ----------------------
// 8. Progress Report (카드형 UI + 퍼센트 변환)
// ----------------------
window.showResultsPage = async function() {
  const phone = document.getElementById("phone-input").value.trim();
  showBox('dev-box');
  document.getElementById('dev-title').innerText = "Loading Results...";

  try {
    const res = await fetch(`${GOOGLE_SCRIPT_URL}?action=getResults&phone=${phone}`);
    const results = await res.json();
    renderResultsCards(results);
    showBox('results-box');
  } catch (e) {
    alert("데이터 로드 실패");
    showBox('unit-selector');
  }
};

function renderResultsCards(data) {
  const container = document.getElementById('results-content');
  container.innerHTML = "";
  for (let u = 0; u < 8; u++) {
    const unitCard = document.createElement('div');
    unitCard.style.cssText = "background:#222; border:1px solid #333; border-radius:15px; padding:15px; margin-bottom:15px; text-align:left;";
    let cardHtml = `<h3 style="color:#39ff14; margin-bottom:12px; border-bottom:1px solid #333; padding-bottom:5px;">Unit ${u+1}</h3>`;
    data.forEach(row => {
      let val = row.units[u] || "-";
      let displayVal = val;
      // 0.04 같은 숫자를 퍼센트로 변환
      if (!isNaN(val) && val !== "" && !val.toString().includes('분') && !val.toString().includes('cycle') && !val.toString().includes('%')) {
        displayVal = Math.round(parseFloat(val) * 100) + "%";
      }
      cardHtml += `
        <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:14px;">
          <span style="color:#aaa;">${row.part}</span>
          <span style="color:${displayVal==="100%"?"#39ff14":"#fff"}; font-weight:bold;">${displayVal}</span>
        </div>
      `;
    });
    unitCard.innerHTML = cardHtml;
    container.appendChild(unitCard);
  }
}

// ----------------------
// 9. 반복듣기 및 공통 로직
// ----------------------
window.startRepeatMode = async function() {
  try {
    const res = await fetch(BASE_URL + currentType + "/" + currentType + currentUnit + ".json");
    currentData = await res.json();
    showBox('repeat-box');
    const list = document.getElementById('repeat-list');
    list.innerHTML = "";
    currentData.forEach((item, idx) => {
      const div = document.createElement('div');
      div.className = 'repeat-item'; div.id = `repeat-${idx}`;
      div.innerHTML = `<div>${item.en}</div><div class="repeat-ko" style="font-size:13px; color:#888;">${item.ko}</div>`;
      list.appendChild(div);
    });
  } catch (e) { alert("데이터 로드 실패"); }
};

window.runRepeatAudio = async function() {
  const countInput = document.getElementById('repeat-count');
  const count = parseInt(countInput.value) || 3;
  isRepeating = true; requestWakeLock();
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
    sendDataToGoogle("반복듣기", (c + 1) + " cycle");
    if (c < count - 1 && isRepeating) await new Promise(r => setTimeout(r, 2000));
  }
  isRepeating = false;
};

function stopRepeatAudio() { isRepeating = false; player.pause(); }

function updateProgress() {
  if (!currentData.length) return;
  const currentCount = ((cycle - 1) * currentData.length) + index;
  const percent = Math.floor((currentCount / (currentTotalCycles * currentData.length)) * 100);
  document.getElementById("progress-percent").innerText = percent + "%";
  document.getElementById("progress").style.width = Math.min(percent, 100) + "%";
}

function sendDataToGoogle(part, val) {
  const phoneInput = document.getElementById("phone-input");
  if (!GOOGLE_SCRIPT_URL.startsWith("http")) return;
  const data = { action: "save", phone: phoneInput.value.trim(), unit: "Unit " + currentUnit, percent: val, part: part };
  fetch(GOOGLE_SCRIPT_URL, { method: "POST", mode: "no-cors", body: JSON.stringify(data) });
}
