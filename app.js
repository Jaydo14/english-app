// ======================================================
// 1. 기본 설정 (GitHub 주소 연결)
// ======================================================
const REPO_USER = "jaydo14"; 
const REPO_NAME = "english-app";
// contents 폴더를 바라보도록 주소 설정
const BASE_URL = `https://raw.githubusercontent.com/${REPO_USER}/${REPO_NAME}/main/contents/`;

// 🚨 [중요] 아까 만든 구글 스크립트 주소를 따옴표 안에 넣어주세요!
const GOOGLE_SCRIPT_URL = "여기에_구글_스크립트_주소를_붙여넣으세요"; 


// ----------------------
// 2. 변수 및 요소 설정
// ----------------------
const loginBox = document.getElementById("login-box");
const app = document.getElementById("app");
const studyBox = document.getElementById("study-box");
const sentenceText = document.getElementById("sentence");
const sentenceKor = document.getElementById("sentence-kor");
const progressBar = document.getElementById("progress");
const progressPercent = document.getElementById("progress-percent");
const phoneInput = document.getElementById("phone-input");
const contentSelect = document.getElementById("content-select");

let currentType = ""; // 예: hc12u
let currentUnit = 1;
let currentData = []; // 가져온 문장들이 여기에 담김
let index = 0;
let cycle = 1;
const totalCycles = 5; 
const player = new Audio(); 

// ----------------------
// 3. 기능 초기화 & 로그인
// ----------------------
function bindClick(el, handler) {
  el.addEventListener("click", handler);
  el.addEventListener("touchstart", handler, { passive: true });
}

window.login = function () {
  const inputVal = phoneInput.value.trim();
  
  if (inputVal.length < 1) {
    alert("번호를 입력해주세요.");
    return;
  }

  // 1. 선택한 교재 이름 가져오기 (예: hc12u)
  currentType = contentSelect.value;
  
  // 2. 화면에 표시할 이름
  const typeText = contentSelect.options[contentSelect.selectedIndex].text;
  
  alert(`환영합니다!\n[${typeText}] 학습을 시작합니다.`);
  document.getElementById("welcome-msg").innerText = `Unit 선택 (${typeText})`;
  
  loginBox.style.display = "none";
  app.style.display = "block";
};

// ----------------------
// 4. GitHub에서 파일 불러오기
// ----------------------
window.selectUnit = async function (n) {
  currentUnit = n;
  
  // ⭐ 파일 이름 조립하기: "hc12u" + "1" + ".json" -> "hc12u1.json"
  // (업로드하신 파일명과 정확히 일치해야 합니다)
  const fileName = `${currentType}${currentUnit}.json`;
  const fullUrl = BASE_URL + fileName;

  console.log("가져올 파일 주소:", fullUrl);

  // 로딩 화면 표시
  studyBox.style.display = "block";
  document.querySelector('.box:not(#study-box)').style.display = 'none';
  sentenceText.innerText = "데이터를 불러오는 중...";
  sentenceKor.innerText = "잠시만 기다려주세요.";

  try {
    // 인터넷에서 파일 읽어오기
    const response = await fetch(fullUrl);
    
    if (!response.ok) {
      throw new Error("파일을 찾을 수 없습니다. (404)");
    }

    currentData = await response.json();
    console.log("데이터 로딩 성공:", currentData);
    
    // 학습 준비 완료
    index = 0;
    cycle = 1;
    updateProgress();
    sentenceText.innerText = "Start 버튼을 눌러주세요";
    sentenceKor.innerText = ""; 

  } catch (error) {
    console.error(error);
    alert(`[오류] '${fileName}' 파일을 찾을 수 없습니다.\nGitHub 'contents' 폴더에 파일이 있는지 확인해주세요.`);
    studyBox.style.display = "none";
    document.querySelector('.box:not(#study-box)').style.display = 'block';
  }
};

window.startStudy = function () {
  playSentence();
};

// ----------------------
// 5. 재생 및 화면 표시
// ----------------------
function playSentence() {
  sentenceText.classList.remove("success", "fail");
  sentenceText.style.color = "#fff"; 
  
  const item = currentData[index];

  // 영어와 한국어 표시
  sentenceText.innerText = item.en;
  sentenceKor.innerText = item.ko;
  
  updateProgress();

  // 오디오 재생
  if (item.audio) {
    // contents 폴더 안에 있는 오디오 파일을 실행
    // 예: BASE_URL + "u1en1.mp3"
    player.src = BASE_URL + item.audio;
    player.play().catch(e => console.log("재생 오류 (터치 필요)", e));
  } else {
    alert("이 문장에는 오디오 정보가 없습니다.");
  }

  player.onended = () => {
    sentenceText.style.color = "#ffff00"; 
    recognizer.start();
  };
}

// ----------------------
// 6. 음성 인식 및 정답 체크
// ----------------------
window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognizer = new SpeechRecognition();
recognizer.lang = "en-US";
recognizer.interimResults = false;
recognizer.maxAlternatives = 1;

recognizer.onresult = (event) => {
  const spokenText = event.results[0][0].transcript;
  const targetText = currentData[index].en;
  
  console.log("내 발음:", spokenText);
  checkAnswer(spokenText, targetText);
};

recognizer.onerror = (event) => {
  console.log("인식 에러", event.error);
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
    // 정답
    sentenceText.innerText = "Great!";
    sentenceKor.innerText = ""; 
    
    sentenceText.classList.remove("fail");
    sentenceText.classList.add("success");
    sentenceText.style.color = "#39ff14"; 
    setTimeout(nextStep, 500); 

  } else {
    // 오답
    sentenceText.innerText = "Try again";
    sentenceKor.innerText = ""; 

    sentenceText.classList.remove("success");
    sentenceText.classList.add("fail");
    sentenceText.style.color = "#ff4b4b"; 
    setTimeout(() => { playSentence(); }, 500);
  }
}

// ----------------------
// 7. 다음 단계 및 저장
// ----------------------
function nextStep() {
  sentenceText.style.color = "#fff"; 
  index++; 

  // 한 바퀴 돌았나?
  if (index >= currentData.length) {
    index = 0; 
    cycle++;   
    sendDataToGoogle(); // 저장
  }

  if (cycle > totalCycles) {
    alert("🎉 학습 완료! 수고하셨습니다.");
    location.reload(); 
    return;
  }

  playSentence();
}

// 구글 시트 저장 함수
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
  }).then(() => console.log("저장 완료"));
}

function updateProgress() {
  const totalSentences = currentData.length;
  const currentCount = ((cycle - 1) * totalSentences) + (index + 1);
  const totalCount = totalCycles * totalSentences;
  
  let percent = (currentCount / totalCount) * 100;
  if (percent > 100) percent = 100;
  const rounded = Math.floor(percent);

  progressBar.style.width = rounded + "%";
  progressPercent.innerText = rounded + "% (Cycle " + cycle + "/" + totalCycles + ")";
}
