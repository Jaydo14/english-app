// ======================================================
// 1. 기본 설정 및 상수 영역
// ======================================================
const REPO_USER = "jaydo14"; // 깃허브 사용자 이름
const REPO_NAME = "english-app"; // 깃허브 저장소 이름
// 깃허브에 올린 음원 및 데이터 파일이 있는 경로 주소입니다.
const BASE_URL = `https://raw.githubusercontent.com/${REPO_USER}/${REPO_NAME}/main/contents/`;
// 학습 기록을 저장할 구글 앱스 스크립트의 주소입니다.
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby59SUYVVYThHqgp6-AcW6Ecvd3idY-6QiAl0Ze5H8avOTzrCe9fuQiQS8qusWGgIrA/exec"; 

const totalCycles = 18; // 진도율 100%를 만들기 위해 반복해야 하는 횟수입니다.

// 교재별 유닛의 제목을 저장한 데이터베이스입니다.
const bookDatabase = {
  "hc12u": { 1: "Music", 2: "Directions", 3: "Favorite beverage", 4: "Movies", 5: "Lunch", 6: "Vacation", 7: "New years", 8: "Switch lives" },
  "fc21u": { 1: "Restaurant", 2: "Birthday", 3: "Expenses", 4: "Dream job", 5: "Movies", 6: "Eating healthy", 7: "Traveling alone", 8: "Education" }
};

// ----------------------
// 2. 변수 및 오디오 설정 영역
// ----------------------
let currentType = "";  // 현재 사용자의 교재 타입 (hc12u 또는 fc21u)
let currentUnit = 1;   // 현재 선택한 유닛 번호
let currentData = [];  // 선택한 유닛의 문장 데이터들
let index = 0;         // 현재 공부 중인 문장의 번호
let cycle = 1;         // 현재 몇 번째 반복(사이클) 중인지
let isRepeating = false; // 반복듣기 기능이 작동 중인지 확인하는 스위치
const player = new Audio(); // 음원을 재생하는 플레이어 객체
let wakeLock = null;   // 화면 꺼짐을 방지하는 기능을 담는 변수

// 정답(성공)과 오답(실패) 시 재생될 효과음 설정입니다.
const successSound = new Audio(BASE_URL + "common/success.mp3");
const failSound = new Audio(BASE_URL + "common/fail.mp3");

// ----------------------
// 3. 화면 관리 및 유틸리티 기능
// ----------------------
// 특정 화면(Box)만 보여주고 나머지는 숨기는 스위치 역할을 하는 함수입니다.
function showBox(boxId) {
  const boxes = ['login-box', 'unit-selector', 'menu-box', 'study-box', 'repeat-box', 'dev-box'];
  boxes.forEach(id => {
    const el = document.getElementById(id);
    if(el) el.style.display = (id === boxId) ? 'block' : 'none';
  });
  const appContainer = document.getElementById("app");
  if(appContainer) appContainer.style.display = "block";
}

// 스마트폰 화면이 자동으로 꺼지는 것을 방지하도록 요청하는 함수입니다.
async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
      console.log('Wake Lock 활성화됨');
    }
  } catch (err) {
    console.log(`Wake Lock 에러: ${err.message}`);
  }
}

// ----------------------
// 4. 로그인 및 유닛 버튼 생성 기능
// ----------------------
window.login = function () {
  const phoneInput = document.getElementById("phone-input");
  const inputVal = phoneInput.value.trim();
  if (inputVal.length < 1) return alert("번호를 입력해주세요.");
  
  const loginBtn = document.querySelector("#login-box button");
  loginBtn.disabled = true;
  loginBtn.innerText = "Checking...";

  // 구글 시트에서 번호를 확인하여 사용자를 인증합니다.
  fetch(GOOGLE_SCRIPT_URL + "?phone=" + inputVal)
  .then(res => res.json())
  .then(data => {
    if (data.result === "success") {
      currentType = data.type; 
      alert(`${data.name}님, 🔥오늘도 화이팅 입니다!🔥`);
      renderUnitButtons(); // 인증 성공 시 유닛 버튼들을 화면에 그립니다.
      showBox('unit-selector'); // 유닛 선택 화면으로 이동합니다.
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

// 교재 정보에 맞춰서 Unit 1~8 버튼을 생성하고 제목을 붙여주는 함수입니다.
function renderUnitButtons() {
  const container = document.getElementById("unit-buttons");
  if(!container) return;
  container.innerHTML = ""; 
  const currentTitles = bookDatabase[currentType] || {};
  for (let i = 1; i <= 8; i++) {
    const btn = document.createElement("button");
    const titleText = currentTitles[i] ? `<br><span class="unit-title" style="font-size:12px; font-weight:normal; color:rgba(0,0,0,0.6);">${currentTitles[i]}</span>` : "";
    btn.innerHTML = `Unit ${i}${titleText}`;
    btn.onclick = () => selectUnit(i); // 버튼을 누르면 해당 유닛을 선택합니다.
    container.appendChild(btn);
  }
}

// ----------------------
// 5. 메뉴 및 모드 제어 기능
// ----------------------
window.selectUnit = async function (n) {
  currentUnit = n;
  const fileName = `${currentType}${currentUnit}.json`;
  const url = BASE_URL + currentType + "/" + fileName;

  try {
    const response = await fetch(url);
    currentData = await response.json(); // 선택한 유닛의 문장 데이터를 가져옵니다.
    const menuTitle = document.getElementById("menu-title");
    if(menuTitle) menuTitle.innerText = `Unit ${n} Menu`;
    showBox('menu-box'); // 유닛 전용 메뉴 화면을 보여줍니다.
  } catch (error) {
    alert("파일을 찾을 수 없습니다.");
  }
};

window.showMenu = () => { stopRepeatAudio(); showBox('menu-box'); }; // 메뉴로 돌아가기
window.goBackToUnits = () => showBox('unit-selector'); // 유닛 선택 화면으로 돌아가기
window.showDevPage = (name) => { // 준비 중인 기능(Voca 등) 알림 화면
  const devTitle = document.getElementById('dev-title');
  if(devTitle) devTitle.innerText = name;
  showBox('dev-box');
};

// ----------------------
// 6. Script 학습 모드 기능
// ----------------------
window.startScriptMode = () => {
  const phone = document.getElementById("phone-input").value.trim();
  const saved = localStorage.getItem(`save_${phone}_unit${currentUnit}`);
  index = 0; cycle = 1;
  // 기존에 공부하던 기록이 있으면 이어서 시작하도록 불러옵니다.
  if (saved) { const p = JSON.parse(saved); index = p.index; cycle = p.cycle; }
  updateProgress();
  showBox('study-box');
};

window.startStudy = function () {
  const startBtn = document.getElementById("start-btn");
  if(startBtn) startBtn.innerText = "Listen again";
  const skipBtn = document.getElementById("skip-btn");
  if(skipBtn) skipBtn.style.display = "inline-block";
  requestWakeLock(); // 공부 시작 시 화면 꺼짐 방지를 실행합니다.
  playSentence();
};

// 현재 번호(index)에 맞는 문장을 소리 내어 읽어주는 함수입니다.
function playSentence() {
  const sText = document.getElementById("sentence");
  if(!sText) return;
  sText.classList.remove("success", "fail");
  sText.style.color = "#fff";
  const item = currentData[index];
  sText.innerText = item.en; // 영어 문장 표시
  const sentenceKor = document.getElementById("sentence-kor");
  if(sentenceKor) sentenceKor.innerText = item.ko; // 한국어 해석 표시
  updateProgress();

  player.src = BASE_URL + currentType + "/" + item.audio;
  player.play();
  player.onended = () => {
    sText.style.color = "#ffff00"; // 음성이 끝나면 글자색을 노란색으로 바꿔 마이크 대기 상태를 알립니다.
    try { recognizer.start(); } catch(e) {} // 음성 인식을 시작합니다.
  };
}

// ----------------------
// 7. 음성 인식 및 정확도 체크 기능
// ----------------------
window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognizer = new SpeechRecognition();
recognizer.lang = "en-US"; // 영어 인식 설정

recognizer.onresult = (event) => {
  const spoken = event.results[0][0].transcript; // 사용자가 말한 내용
  const clean = (str) => str.toLowerCase().replace(/[.,?!'"]/g, "").trim();
  const userWords = clean(spoken).split(/\s+/);
  const targetWords = clean(currentData[index].en).split(/\s+/);
  
  let matches = 0;
  targetWords.forEach(w => { if (userWords.includes(w)) matches++; });

  const accuracy = matches / targetWords.length;
  const sText = document.getElementById("sentence");

  if (accuracy >= 0.6) { // 단어의 50% 이상을 맞추면 성공으로 간주합니다.
    successSound.play().catch(e => {}); // 딩동! 효과음
    if(sText) {
        sText.innerText = "Great!";
        sText.classList.add("success");
    }
    setTimeout(nextStep, 700); // 0.7초 후 다음 문장으로 이동
  } else {
    failSound.play().catch(e => {}); // 삑! 효과음
    if(sText) {
        sText.innerText = "Try again";
        sText.classList.add("fail");
    }
    setTimeout(playSentence, 800); // 0.8초 후 문장 다시 들려주기
  }
};

// 다음 단계(문장)로 넘어가는 함수입니다.
window.nextStep = function() {
  try { recognizer.abort(); } catch(e) {} // 인식기 중단
  index++; // 문장 번호 증가
  if (index >= currentData.length) { index = 0; cycle++; } // 유닛 한 바퀴 다 돌면 사이클 증가
  const phone = document.getElementById("phone-input").value.trim();
  // 휴대폰 내부에 실시간 공부 기록을 저장합니다.
  localStorage.setItem(`save_${phone}_unit${currentUnit}`, JSON.stringify({index, cycle}));
  sendDataToGoogle(); // 구글 시트로 진도율 데이터를 전송합니다.
  playSentence();
};

// ----------------------
// 8. 반복 듣기 모드 기능
// ----------------------
window.startRepeatMode = () => {
  showBox('repeat-box');
  const list = document.getElementById('repeat-list');
  if(!list) return;
  list.innerHTML = "";
  // 현재 유닛의 모든 문장을 목록으로 만듭니다.
  currentData.forEach((item, idx) => {
    const div = document.createElement('div');
    div.className = 'repeat-item'; div.id = `repeat-${idx}`;
    div.innerHTML = `<div>${item.en}</div><div class="repeat-ko" style="font-size:13px; color:#888;">${item.ko}</div>`;
    list.appendChild(div);
  });
};

// 목록에 있는 문장들을 지정한 횟수만큼 자동 재생하는 함수입니다.
window.runRepeatAudio = async function() {
  const countInput = document.getElementById('repeat-count');
  const count = parseInt(countInput ? countInput.value : 3) || 3;
  isRepeating = true;
  requestWakeLock();
  for (let c = 0; c < count; c++) {
    if (!isRepeating) break;
    for (let i = 0; i < currentData.length; i++) {
      if (!isRepeating) break;
      await new Promise((resolve) => {
        // 재생 중인 문장에 초록색 강조 테두리를 줍니다.
        document.querySelectorAll('.repeat-item').forEach(r => r.classList.remove('playing'));
        const el = document.getElementById(`repeat-${i}`);
        if(el) { el.classList.add('playing'); el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
        player.src = `${BASE_URL}${currentType}/${currentData[i].audio}`;
        player.play(); player.onended = () => resolve(); // 소리가 끝나면 다음 문장으로
      });
    }
    // 한 사이클이 끝나면 2초간 쉬었다가 다음 반복을 시작합니다.
    if (c < count - 1 && isRepeating) await new Promise(r => setTimeout(r, 2000));
  }
  isRepeating = false;
};

window.stopRepeatAudio = () => { isRepeating = false; player.pause(); };

// ----------------------
// 9. 진행률 계산 및 구글 전송 기능
// ----------------------
// 현재 전체 진도율이 몇 %인지 계산하고 막대 그래프를 업데이트합니다.
function updateProgress() {
  if (!currentData.length) return;
  const currentCount = ((cycle - 1) * currentData.length) + index;
  const percent = Math.floor((currentCount / (totalCycles * currentData.length)) * 100);
  const progressPercent = document.getElementById("progress-percent");
  if(progressPercent) progressPercent.innerText = percent + "%";
  const progressBar = document.getElementById("progress");
  if(progressBar) progressBar.style.width = Math.min(percent, 100) + "%";
}

// 구글 앱스 스크립트로 학습 데이터를 보냅니다.
function sendDataToGoogle() {
  const phoneInput = document.getElementById("phone-input");
  if (!GOOGLE_SCRIPT_URL.startsWith("http")) return;
  const currentCount = ((cycle - 1) * currentData.length) + index;
  const percent = Math.floor((currentCount / (totalCycles * currentData.length)) * 100);
  // 전화번호, 유닛번호, 진도율을 묶어서 보냅니다.
  const data = { action: "save", phone: phoneInput.value.trim(), unit: "Unit " + currentUnit, percent: percent };
  fetch(GOOGLE_SCRIPT_URL, { method: "POST", mode: "no-cors", body: JSON.stringify(data) });
}
