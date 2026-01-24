// ======================================================
// 1. 기본 설정 및 상수
// ======================================================
const REPO_USER = "jaydo14"; 
const REPO_NAME = "english-app";
const BASE_URL = `https://raw.githubusercontent.com/${REPO_USER}/${REPO_NAME}/main/contents/`;

// 🚨 [필수] 구글 스크립트 주소를 여기에 넣으세요!
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby4tsK2iqumwsr9-BsBTYXeb_sFdBKBCwa0Vd1gMchYDryJ-dpSxinm5WDB2TjkkQ0d/exec"; 

const totalCycles = 18; 

const bookDatabase = {
  "hc12u": {
    1: "Music",
    2: "Directions",
    3: "Favorite beverage and snack",
    4: "Where you like to watch movies",
    5: "Lunch",
    6: "Vacation",
    7: "New years",
    8: "Switch lives"
  },
  "fc21u": {
    1: "Restaurant",
    2: "Birthday",
    3: "Expenses",
    4: "Dream job",
    5: "Movies",
    6: "Eating healthy",
    7: "Traveling alone",
    8: "Education"
  }
};

// ----------------------
// 2. 변수 및 요소 가져오기
// ----------------------
const loginBox = document.getElementById("login-box");
const app = document.getElementById("app");
const unitButtonsContainer = document.getElementById("unit-buttons");
const phoneInput = document.getElementById("phone-input");

// 화면 박스들
const menuBox = document.getElementById("menu-box");
const studyBox = document.getElementById("study-box");
const devBox = document.getElementById("dev-box");
const repeatBox = document.getElementById("repeat-box");
const allBoxes = [loginBox, menuBox, studyBox, devBox, repeatBox];

// Script(학습) 관련 요소
const sentenceText = document.getElementById("sentence");
const sentenceKor = document.getElementById("sentence-kor");
const progressBar = document.getElementById("progress");
const progressPercent = document.getElementById("progress-percent");
const startBtn = document.getElementById("start-btn");
const skipBtn = document.getElementById("skip-btn");

// 반복듣기 관련 요소
const repeatList = document.getElementById("repeat-list");
const repeatCountInput = document.getElementById("repeat-count");
let isRepeating = false; // 반복 재생 중인지 확인용

let currentType = ""; 
let currentUnit = 1;
let currentData = []; 
let index = 0;
let cycle = 1;

const player = new Audio(); 
let wakeLock = null; 

// ----------------------
// 3. 화면 유틸리티 함수
// ----------------------
function showBox(targetBox) {
  // 모든 박스 숨기기
  allBoxes.forEach(box => {
    if(box) box.style.display = "none";
  });
  document.querySelectorAll('.box').forEach(b => b.style.display = 'none');
  
  // 목표 박스만 보이기
  if(targetBox) {
    targetBox.style.display = "block";
    app.style.display = "block"; // 앱 컨테이너는 항상 켜둠
  }
}

// ----------------------
// 4. 화면 꺼짐 방지
// ----------------------
async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
      console.log('Wake Lock active');
    }
  } catch (err) {
    console.log(`${err.name}, ${err.message}`);
  }
}

document.addEventListener('visibilitychange', async () => {
  if (wakeLock !== null && document.visibilityState === 'visible') {
    await requestWakeLock();
  }
});

// ----------------------
// 5. 로그인 및 초기화
// ----------------------
window.login = function () {
  const inputVal = phoneInput.value.trim();
  const loginBtn = document.querySelector("#login-box button");
  
  if (inputVal.length < 1) {
    alert("번호를 입력해주세요.");
    return;
  }

  loginBtn.disabled = true;
  loginBtn.innerText = "확인 중...";

  fetch(GOOGLE_SCRIPT_URL + "?phone=" + inputVal)
  .then(res => res.json())
  .then(data => {
    if (data.result === "success") {
      currentType = data.type; 
      const studentName = data.name;

      alert(`${studentName}님, 🔥오늘도 화이팅 입니다!🔥`);
      renderUnitButtons();
      
      // 유닛 선택 화면만 남기고 나머지 숨김 (HTML 구조상 .box 클래스 활용)
      loginBox.style.display = "none";
      app.style.display = "block";
      document.querySelector('.box:not(#login-box)').style.display = 'block'; // Unit 선택박스
      showBox(document.querySelector('.box:nth-child(2)')); // 편의상 두번째가 유닛박스라 가정, 아래 로직으로 대체
      
      // 더 깔끔하게: 모든 박스 숨기고 유닛버튼 컨테이너가 있는 상위 div만 보여야 함.
      // 기존 HTML 구조를 유지하되, showBox 로직을 위해 id가 없는 유닛박스는 예외처리 필요
      // 여기서는 단순히 loginBox만 끄고 app을 켬
      document.getElementById("welcome-msg").innerText = "Unit 선택";
      document.getElementById("unit-buttons").parentElement.style.display = "block";

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
// 6. 유닛 선택 -> 데이터 로드 -> 메뉴 이동
// ----------------------
window.selectUnit = async function (n) {
  currentUnit = n;
  const fileName = `${currentType}${currentUnit}.json`;
  const fullUrl = BASE_URL + currentType + "/" + fileName;

  // 로딩 표시
  document.getElementById("welcome-msg").innerText = "Loading...";

  try {
    const response = await fetch(fullUrl);
    if (!response.ok) throw new Error("파일 없음");

    currentData = await response.json();
    
    // 데이터 로드 성공하면 메뉴 화면으로 이동
    document.getElementById("menu-title").innerText = `Unit ${currentUnit} Menu`;
    showMenu();

  } catch (error) {
    alert(`[오류] 파일을 찾을 수 없습니다.\n(${fileName})`);
    document.getElementById("welcome-msg").innerText = "Unit 선택";
  }
};

window.showMenu = function() {
  // 유닛 버튼 박스 숨기기 (id가 없어서 parentElement로 접근하거나, html 구조에 따라 다름)
  document.getElementById("unit-buttons").parentElement.style.display = "none";
  showBox(menuBox);
};

window.goBackToUnit = function() {
  showBox(null); // 다 숨기고
  document.getElementById("unit-buttons").parentElement.style.display = "block"; // 유닛박스만 켬
  document.getElementById("welcome-msg").innerText = "Unit 선택";
};

// ----------------------
// 7. 각 모드 진입 함수
// ----------------------

// A. Script (기존 학습 모드)
window.startScriptMode = function() {
  showBox(studyBox);
  requestWakeLock();
  
  // 기존 로직 복원: 저장된 진행상황 불러오기
  const userPhone = phoneInput.value.trim();
  const saveKey = `save_${userPhone}_unit${currentUnit}`;
  const savedData = localStorage.getItem(saveKey);

  index = 0; 
  cycle = 1;

  if (savedData) {
    const parsed = JSON.parse(savedData);
    index = parsed.index;
    cycle = parsed.cycle;
  }
  
  if (startBtn) startBtn.innerText = "Start";
  if (skipBtn) skipBtn.style.display = "none";
  sentenceText.innerText = "Start 버튼을 눌러주세요";
  sentenceKor.innerText = "";
  updateProgress();
};

// B. Vocab & AS Correction (개발중)
window.startDevMode = function() {
  showBox(devBox);
};

// C. 반복 듣기 (새 기능)
window.startRepeatMode = function() {
  showBox(repeatBox);
  requestWakeLock();
  isRepeating = false;

  // 리스트 렌더링
  repeatList.innerHTML = "";
  if(currentData.length === 0) {
    repeatList.innerText = "데이터가 없습니다.";
    return;
  }

  currentData.forEach((item, idx) => {
    const div = document.createElement("div");
    div.style.marginBottom = "10px";
    div.style.padding = "10px";
    div.style.backgroundColor = "#333";
    div.style.borderRadius = "5px";
    div.style.fontSize = "14px";
    div.innerHTML = `
      <div style="color: #ffff00; margin-bottom: 4px;">${idx + 1}. ${item.en}</div>
      <div style="color: #aaa;">${item.ko}</div>
    `;
    repeatList.appendChild(div);
  });
};

// ----------------------
// 8. 반복 듣기 로직
// ----------------------
window.runRepeatAudio = async function() {
  if (isRepeating) return; // 이미 실행 중이면 무시
  const count = parseInt(repeatCountInput.value);
  
  if (isNaN(count) || count < 1) {
    alert("올바른 숫자를 입력하세요.");
    return;
  }

  isRepeating = true;
  document.getElementById("repeat-play-btn").innerText = "재생 중...";
  document.getElementById("repeat-play-btn").disabled = true;

  // 전체 사이클 반복 (사용자가 입력한 횟수만큼)
  for (let c = 1; c <= count; c++) {
    if (!isRepeating) break; // 정지 버튼 눌렀으면 종료

    // 한 유닛의 모든 오디오 순차 재생
    for (let i = 0; i < currentData.length; i++) {
      if (!isRepeating) break;
      await playAudioPromise(currentData[i].audio, i);
    }

    // 한 사이클 끝남 -> 3초 대기 (마지막 바퀴가 아니면)
    if (c < count && isRepeating) {
      console.log("3초 대기 중...");
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  // 종료 처리
  isRepeating = false;
  document.getElementById("repeat-play-btn").innerText = "재생 시작";
  document.getElementById("repeat-play-btn").disabled = false;
  alert("반복 재생이 완료되었습니다.");
};

window.stopRepeatAudio = function() {
  isRepeating = false;
  player.pause();
  player.currentTime = 0;
  document.getElementById("repeat-play-btn").innerText = "재생 시작";
  document.getElementById("repeat-play-btn").disabled = false;
};

// 오디오 재생을 Promise로 감싸서 await 할 수 있게 만듦
function playAudioPromise(audioFile, highlightIndex) {
  return new Promise((resolve) => {
    if (!audioFile) { resolve(); return; }

    // 현재 재생 중인 문장 하이라이트 (선택사항)
    const listItems = repeatList.children;
    if(listItems[highlightIndex]) {
      listItems[highlightIndex].style.border = "1px solid #ffff00";
      listItems[highlightIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    player.src = BASE_URL + currentType + "/" + audioFile;
    player.play()
      .then(() => {
        player.onended = () => {
           // 하이라이트 해제
           if(listItems[highlightIndex]) listItems[highlightIndex].style.border = "none";
           resolve(); 
        };
      })
      .catch(e => {
        console.error("재생 오류", e);
        resolve(); // 오류 나도 다음으로 넘어감
      });
  });
}

// ----------------------
// 9. 기존 Script 학습 기능 (Script 버튼 눌렀을 때 실행)
// ----------------------
window.startStudy = function () {
  if (startBtn) startBtn.innerText = "Listen again";
  if (skipBtn) skipBtn.style.display = "inline-block";
  playSentence();
};

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

// ... (음성인식 관련 코드는 기존과 동일, 그대로 유지됨)
window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognizer = new SpeechRecognition();
recognizer.lang = "en-US";
recognizer.interimResults = false;
recognizer.maxAlternatives = 1;

recognizer.onerror = (event) => {
  if (event.error === 'not-allowed' || event.error === 'service-not-allowed') return;
  sentenceText.innerText = "Try again";
  sentenceKor.innerText = "";
  sentenceText.classList.add("fail");
  sentenceText.style.color = "#ff4b4b"; 
  setTimeout(() => { playSentence(); }, 500);
};

recognizer.onresult = (event) => {
  const spokenText = event.results[0][0].transcript;
  const targetText = currentData[index].en;
  checkAnswer(spokenText, targetText);
};

function checkAnswer(spoken, target) {
  const clean = (str) => str.toLowerCase().replace(/[.,?!'"]/g, "").trim();
  const userWords = clean(spoken).split(/\s+/); 
  const targetWords = clean(target).split(/\s+/);

  let matchCount = 0;
  targetWords.forEach(word => {
    if (userWords.includes(word)) matchCount++;
  });

  const accuracy = matchCount / targetWords.length;

  if (accuracy >= 0.5) {
    sentenceText.innerText = "Great!";
    sentenceKor.innerText = ""; 
    sentenceText.classList.remove("fail");
    sentenceText.classList.add("success");
    sentenceText.style.color = "#39ff14"; 
    setTimeout(nextStep, 500); 
  } else {
    sentenceText.innerText = "Try again";
    sentenceKor.innerText = ""; 
    sentenceText.classList.remove("success");
    sentenceText.classList.add("fail");
    sentenceText.style.color = "#ff4b4b"; 
    setTimeout(() => { playSentence(); }, 500);
  }
}

window.nextStep = function() {
  try { recognizer.abort(); } catch(e) {}
  sentenceText.style.color = "#fff"; 
  index++; 

  const userPhone = phoneInput.value.trim();
  const saveKey = `save_${userPhone}_unit${currentUnit}`;
  const state = { index: index, cycle: cycle };
  localStorage.setItem(saveKey, JSON.stringify(state));

  sendDataToGoogle(); 

  if (index >= currentData.length) {
    index = 0; 
    cycle++;   
    state.index = 0;
    state.cycle = cycle;
    localStorage.setItem(saveKey, JSON.stringify(state));
    sendDataToGoogle();

    if (cycle === totalCycles + 1) {
       alert("🎉 100% 달성! 축하합니다!\n\n[확인]을 누르면 계속해서 누적 학습을 진행할 수 있습니다.");
    }
  }
  playSentence();
};

function getGlobalProgress() {
  if (!currentData || currentData.length === 0) return 0;
  const totalSentences = currentData.length;
  const totalGoal = totalCycles * totalSentences;
  const currentCount = ((cycle - 1) * totalSentences) + index;
  let p = (currentCount / totalGoal) * 100;
  return Math.floor(p);
}

function sendDataToGoogle() {
  if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes("주소를")) return;
  const percent = getGlobalProgress();
  const data = {
    action: "save",
    phone: phoneInput.value.trim(),
    unit: "Unit " + currentUnit,
    percent: percent 
  };
  fetch(GOOGLE_SCRIPT_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

function updateProgress() {
  const percent = getGlobalProgress();
  progressPercent.innerText = percent + "%";
  let barWidth = percent;
  if (barWidth > 100) barWidth = 100;
  progressBar.style.width = barWidth + "%";
}
