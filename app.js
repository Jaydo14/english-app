// ======================================================
// 1. 기본 설정 및 상수
// ======================================================
const REPO_USER = "jaydo14"; 
const REPO_NAME = "english-app";
const BASE_URL = `https://raw.githubusercontent.com/${REPO_USER}/${REPO_NAME}/main/contents/`;

// 🚨 [필수] 아까 새로 만든 구글 스크립트 주소를 여기에 넣으세요!
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby4tsK2iqumwsr9-BsBTYXeb_sFdBKBCwa0Vd1gMchYDryJ-dpSxinm5WDB2TjkkQ0d/exec"; 

const totalCycles = 18; // 18바퀴가 목표

// 교재별 제목 데이터베이스
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

// ----------------------
// 3. 화면 꺼짐 방지 함수 (Wake Lock)
// ----------------------
async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
      console.log('화면 켜짐 유지 활성화');
      wakeLock.addEventListener('release', () => {
        console.log('화면 켜짐 유지 해제됨');
      });
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
// 4. 초기화 및 유닛 버튼 생성
// ----------------------
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
// 5. 로그인
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

      if (!bookDatabase[currentType]) {
        console.warn("제목 데이터가 없는 교재입니다: " + currentType);
      }

      alert(`${studentName}님, 오늘도 화이팅 입니다.`);
      
      renderUnitButtons();
      document.getElementById("welcome-msg").innerText = "Unit 선택";
      
      loginBox.style.display = "none";
      app.style.display = "block";
    } else {
      alert("등록되지 않은 번호입니다. 선생님께 문의하세요.");
      loginBtn.disabled = false;
      loginBtn.innerText = "Login";
    }
  })
  .catch(error => {
    console.error(error);
    alert("접속 오류! 인터넷 연결을 확인하세요.");
    loginBtn.disabled = false;
    loginBtn.innerText = "Login";
  });
};

// ----------------------
// 6. 유닛 선택 및 데이터 로드
// ----------------------
window.selectUnit = async function (n) {
  currentUnit = n;
  
  const fileName = `${currentType}${currentUnit}.json`;
  const fullUrl = BASE_URL + currentType + "/" + fileName;

  studyBox.style.display = "block";
  document.querySelector('.box:not(#study-box)').style.display = 'none';
  sentenceText.innerText = "Loading...";
  sentenceKor.innerText = "";

  if (startBtn) startBtn.innerText = "Start";
  if (skipBtn) skipBtn.style.display = "none"; 

  try {
    const response = await fetch(fullUrl);
    if (!response.ok) throw new Error("파일 없음");

    currentData = await response.json();
    
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

    updateProgress();
    sentenceText.innerText = "Start 버튼을 눌러주세요";

  } catch (error) {
    alert(`[오류] 파일을 찾을 수 없습니다.\n(${fileName})`);
    studyBox.style.display = "none";
    document.querySelector('.box:not(#study-box)').style.display = 'block';
  }
};

// ----------------------
// 7. 학습 시작 (Wake Lock 실행)
// ----------------------
window.startStudy = function () {
  if (startBtn) startBtn.innerText = "Listen again";
  if (skipBtn) skipBtn.style.display = "inline-block";

  requestWakeLock();
  playSentence();
};

// ----------------------
// 8. 재생 및 화면 표시
// ----------------------
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
  } else {
    alert("오디오 파일 정보가 없습니다.");
  }

  player.onended = () => {
    sentenceText.style.color = "#ffff00"; 
    try { recognizer.start(); } catch(e) {}
  };
}

// ----------------------
// 9. 음성 인식 및 정답 체크
// ----------------------
window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognizer = new SpeechRecognition();
recognizer.lang = "en-US";
recognizer.interimResults = false;
recognizer.maxAlternatives = 1;

recognizer.onerror = (event) => {
  if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
     return;
  }
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

// ----------------------
// 10. 다음 단계
// ----------------------
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
    
    // 사이클 넘어가도 저장
    sendDataToGoogle();
  }

  if (cycle > totalCycles) {
    alert("🎉 학습 완료! 수고하셨습니다.");
    localStorage.removeItem(saveKey); 
    if (wakeLock !== null) {
      wakeLock.release().then(() => { wakeLock = null; });
    }
    location.reload(); 
    return;
  }

  playSentence();
};

// ----------------------
// 11. 구글 전송 및 진행률 계산 (수정됨)
// ----------------------

// ⭐ [수정됨] 18바퀴 기준 전체 진행률 계산 함수
function getGlobalProgress() {
  if (!currentData || currentData.length === 0) return 0;
  
  const totalSentences = currentData.length;
  // 전체 목표 = 18바퀴 * 문장 수
  const totalGoal = totalCycles * totalSentences;
  // 현재까지 한 양 = (지난 바퀴 * 문장 수) + 현재 문장 번호
  const currentCount = ((cycle - 1) * totalSentences) + index;
  
  // 퍼센트 계산
  let p = (currentCount / totalGoal) * 100;
  if (p > 100) p = 100; // 100% 넘지 않게 고정
  
  return Math.floor(p);
}

function sendDataToGoogle() {
  if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes("주소를")) return;
  
  // 전체 진도율(0~100%)을 가져옴
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
  // 전체 진도율(0~100%)
  const percent = getGlobalProgress();
  
  // 화면 글씨: 0% ~ 100%
  progressPercent.innerText = percent + "%";

  // 막대바: 0% ~ 100%
  progressBar.style.width = percent + "%";
}
