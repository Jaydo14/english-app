// ======================================================
// 1. 기본 설정 및 상수
// ======================================================
const REPO_USER = "jaydo14"; 
const REPO_NAME = "english-app";
const BASE_URL = `https://raw.githubusercontent.com/${REPO_USER}/${REPO_NAME}/main/contents/`;

// 🚨 구글 스크립트 주소 (기존 것 그대로 쓰세요)
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxjrkSJiUr2Vt7AglXAVoAYo6UXaP0guBMj2krTu5bD2HsdxhYWMJRA8rhyt47ZDFl1/exec"; 

const totalCycles = 18;

// ⭐ [수정됨] 교재별 제목 데이터베이스
// 여기에 새 교재가 생길 때마다 추가해주면 됩니다.
const bookDatabase = {
  // 기존 교재
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
  // ⭐ 새로 추가한 교재 (fc21u)
  // 따옴표 안의 제목을 실제 교재 내용에 맞게 고쳐주세요!
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

let currentType = ""; 
let currentUnit = 1;
let currentData = []; 
let index = 0;
let cycle = 1;

const player = new Audio(); 

// ----------------------
// 3. 초기화 및 유닛 버튼 생성 (제목 자동 적용)
// ----------------------
function renderUnitButtons() {
  unitButtonsContainer.innerHTML = ""; 
  
  // 현재 교재(currentType)에 맞는 제목들 가져오기
  // 만약 제목이 없으면 그냥 빈칸("")으로 둠
  const currentTitles = bookDatabase[currentType] || {};

  for (let i = 1; i <= 8; i++) {
    const btn = document.createElement("button");
    
    // 제목이 있으면 넣고, 없으면 Unit 번호만 표시
    const titleText = currentTitles[i] ? `<br><span class="unit-title">${currentTitles[i]}</span>` : "";
    
    btn.innerHTML = `Unit ${i}${titleText}`;
    btn.onclick = () => selectUnit(i);
    unitButtonsContainer.appendChild(btn);
  }
}

// ----------------------
// 4. 로그인 (구글 시트 연동)
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
      // 로그인 성공
      currentType = data.type; // 예: hc12u 또는 fc21u
      const studentName = data.name;

      // 교재 코드가 데이터베이스에 있는지 확인 (없으면 경고)
      if (!bookDatabase[currentType]) {
        console.warn("제목 데이터가 없는 교재입니다: " + currentType);
      }

      alert(`반갑습니다, ${studentName}님!\n[${currentType}] 과정을 학습합니다.`);
      
      renderUnitButtons(); // 버튼 생성 (제목 적용)
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
// 5. 유닛 선택 및 데이터 로드
// ----------------------
window.selectUnit = async function (n) {
  currentUnit = n;
  
  const fileName = `${currentType}${currentUnit}.json`;
  // 경로: contents / 교재코드 / 파일명
  const fullUrl = BASE_URL + currentType + "/" + fileName;

  studyBox.style.display = "block";
  document.querySelector('.box:not(#study-box)').style.display = 'none';
  sentenceText.innerText = "Loading...";
  sentenceKor.innerText = "";

  const startBtn = document.querySelector("#study-box button");
  if (startBtn) startBtn.innerText = "Start";

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
// 6. 학습 시작
// ----------------------
window.startStudy = function () {
  const startBtn = document.querySelector("#study-box button");
  if (startBtn) {
    startBtn.innerText = "Listen again";
  }
  playSentence();
};

// ----------------------
// 7. 재생 및 화면 표시
// ----------------------
function playSentence() {
  sentenceText.classList.remove("success", "fail");
  sentenceText.style.color = "#fff"; 
  
  const item = currentData[index];
  sentenceText.innerText = item.en;
  sentenceKor.innerText = item.ko;
  
  updateProgress();

  if (item.audio) {
    // 경로: contents / 교재코드 / 오디오파일명
    player.src = BASE_URL + currentType + "/" + item.audio;
    player.play().catch(e => console.log("재생 오류", e));
  } else {
    alert("오디오 파일 정보가 없습니다.");
  }

  player.onended = () => {
    sentenceText.style.color = "#ffff00"; 
    recognizer.start();
  };
}

// ----------------------
// 8. 음성 인식 및 정답 체크
// ----------------------
window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognizer = new SpeechRecognition();
recognizer.lang = "en-US";
recognizer.interimResults = false;
recognizer.maxAlternatives = 1;

recognizer.onresult = (event) => {
  const spokenText = event.results[0][0].transcript;
  const targetText = currentData[index].en;
  checkAnswer(spokenText, targetText);
};

recognizer.onerror = (event) => {
  sentenceText.innerText = "Try again";
  sentenceKor.innerText = "";
  sentenceText.classList.add("fail");
  sentenceText.style.color = "#ff4b4b"; 
  setTimeout(() => { playSentence(); }, 500);
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
// 9. 다음 단계 및 저장
// ----------------------
function nextStep() {
  sentenceText.style.color = "#fff"; 
  index++; 

  const userPhone = phoneInput.value.trim();
  const saveKey = `save_${userPhone}_unit${currentUnit}`;
  const state = { index: index, cycle: cycle };
  localStorage.setItem(saveKey, JSON.stringify(state));

  if (index >= currentData.length) {
    index = 0; 
    cycle++;   
    
    state.index = 0;
    state.cycle = cycle;
    localStorage.setItem(saveKey, JSON.stringify(state));

    sendDataToGoogle(); 
  }

  if (cycle > totalCycles) {
    alert("🎉 학습 완료! 수고하셨습니다.");
    localStorage.removeItem(saveKey); 
    location.reload(); 
    return;
  }

  playSentence();
}

function sendDataToGoogle() {
  if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes("주소를")) return;
  const data = {
    action: "save",
    phone: phoneInput.value.trim(),
    unit: "Unit " + currentUnit,
    cycle: cycle - 1
  };
  
  fetch(GOOGLE_SCRIPT_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

function updateProgress() {
  const totalSentences = currentData.length;
  const currentCount = ((cycle - 1) * totalSentences) + (index + 1);
  const totalCount = totalCycles * totalSentences;
  
  let percent = (currentCount / totalCount) * 100;
  if (percent > 100) percent = 100;
  const rounded = Math.floor(percent);

  progressBar.style.width = rounded + "%";
  progressPercent.innerText = rounded + "%";
}
