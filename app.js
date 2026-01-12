document.addEventListener("DOMContentLoaded", () => {

  // ====== 로그인 ======
  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  const loginBox = document.getElementById("login-box");
  const appBox = document.getElementById("app");
  const loginMessage = document.getElementById("login-message");

  // 원하는 아이디 / 비번으로 변경 가능
  const CORRECT_ID = "test";
  const CORRECT_PW = "1234";

  loginBtn.addEventListener("click", () => {
    const id = document.getElementById("username").value;
    const pw = document.getElementById("password").value;

    if (id === CORRECT_ID && pw === CORRECT_PW) {
      loginMessage.textContent = "Login success!";
      loginBox.style.display = "none";
      appBox.style.display = "block";
    } else {
      loginMessage.textContent = "Wrong ID or Password";
    }
  });

  logoutBtn.addEventListener("click", () => {
    appBox.style.display = "none";
    loginBox.style.display = "block";
  });


  // ====== 음성 재생 ======
  const audioFiles = [
    "1_en.mp3",
    "2_en.mp3",
    "3_en.mp3",
    "4_en.mp3",
    "5_en.mp3",
    "6_en.mp3",
    "7_en.mp3",
    "8_en.mp3"
  ];

  const buttonsDiv = document.getElementById("buttons");
  const audio = new Audio();

  // 버튼 자동 생성
  audioFiles.forEach((file, index) => {
    const btn = document.createElement("button");
    btn.textContent = `Play ${index + 1}`;

    btn.addEventListener("click", () => {
      // 🔥 캐시 문제 방지 (지금 문제가 이거였음)
      audio.src = file + "?v=" + Date.now();
      audio.load();
      audio.play();
    });

    buttonsDiv.appendChild(btn);
  });

});
