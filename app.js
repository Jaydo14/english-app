/* -------------------------
   UNIT 데이터
-------------------------- */
const units = {
  1: [
    "What's your favorite food?",
    "My favorite food is Korean food.",
    "I like all kinds of Korean food.",
    "What's your favorite among them?",
    "I really enjoy different kinds of stews and soups.",
    "If I have to pick one, I would pick seaweed soup.",
    "But I'm not very picky about food.",
    "So I enjoy all types of cuisine."
  ]
};

/* -------------------------
   MP3 주소
-------------------------- */
const audioList = [
  "https://raw.githubusercontent.com/jaydo14/english-app/main/1_en.mp3",
  "https://raw.githubusercontent.com/jaydo14/english-app/main/2_en.mp3",
  "https://raw.githubusercontent.com/jaydo14/english-app/main/3_en.mp3",
  "https://raw.githubusercontent.com/jaydo14/english-app/main/4_en.mp3",
  "https://raw.githubusercontent.com/jaydo14/english-app/main/5_en.mp3",
  "https://raw.githubusercontent.com/jaydo14/english-app/main/6_en.mp3",
  "https://raw.githubusercontent.com/jaydo14/english-app/main/7_en.mp3",
  "https://raw.githubusercontent.com/jaydo14/english-app/main/8_en.mp3"
];

let index = 0;
let audioPlayer = new Audio();

/* -------------------------
   로그인
-------------------------- */
document.getElementById("loginBtn").addEventListener("click", () => {

  const name = document.getElementById("username").value.trim();

  if (!name){
    alert("이름을 입력하세요");
    return;
  }

  document.getElementById("unitSection").style.display = "block";
});

/* -------------------------
   UNIT 선택
-------------------------- */
function selectUnit(n){
  index = 0;

  document.getElementById("studySection").style.display = "block";

  showSentence();
}

/* -------------------------
   문장 표시 + 음성 재생
-------------------------- */
function showSentence(){

  const text = units[1][index];

  document.getElementById("targetSentence").innerText = text;
  document.getElementById("recognizedText").innerHTML = "";
  document.getElementById("progressRate").innerText = "인식 진행률: 0%";

  audioPlayer.src = audioList[index];
  audioPlayer.play();

  audioPlayer.onended = () => {
    startRecognition();
  };
}

/* -------------------------
   음성 인식
-------------------------- */
function startRecognition(){

  const recognition = new webkitSpeechRecognition();
  recognition.lang = "en-US";
  recognition.continuous = true;
  recognition.interimResults = true;

  const target = units[1][index].toLowerCase();

  recognition.onresult = (event) => {

    let spoken = "";

    for(let i = 0; i < event.results.length; i++){
      spoken += event.results[i][0].transcript;
    }

    spoken = spoken.toLowerCase();

    visualize(target, spoken);
  };

  recognition.start();
}

/* -------------------------
   인식 진행률 표시
-------------------------- */
function visualize(target, spoken){

  let match = 0;

  for(let i = 0; i < target.length; i++){
    if(spoken[i] === target[i]){
      match++;
    }
  }

  const percent = Math.round((match / target.length) * 100);

  document.getElementById("progressRate").innerText =
    "인식 진행률: " + percent + "%";

  if(percent >= 50){
    nextSentence();
  }
}

/* -------------------------
   다음 문장
-------------------------- */
function nextSentence(){

  index++;

  if(index >= units[1].length){
    alert("Unit 완료!");
    index = 0;
  }

  showSentence();
}
