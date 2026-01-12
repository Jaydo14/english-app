// 페이지 준비 후 실행
window.onload = () => {

  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const loginBox = document.getElementById("login-box");
  const appBox = document.getElementById("app");
  const loginMessage = document.getElementById("login-message");

  const CORRECT_ID = "test";
  const CORRECT_PW = "1234";

  // 로그인 버튼 클릭 처리
  loginBtn.onclick = () => {
    const id = document.getElementById("username").value;
    const pw = document.getElementById("password").value;

    if (id === CORRECT_ID && pw === CORRECT_PW) {
      loginMessage.textContent = "로그인 성공!";
      loginBox.style.display = "none";
      appBox.style.display = "block";
    } else {
      loginMessage.textContent = "아이디 또는 비밀번호가 틀렸습니다.";
    }
  };

  // 로그아웃
  logoutBtn.onclick = () => {
    appBox.style.display = "none";
    loginBox.style.display = "block";
  };

  // 음성 목록
  const files = [
    "1_en.mp3","2_en.mp3","3_en.mp3","4_en.mp3",
    "5_en.mp3","6_en.mp3","7_en.mp3","8_en.mp3"
  ];

  const buttonsDiv = document.getElementById("buttons");
  const player = new Audio();

  files.forEach((f, i) => {
    const b = document.createElement("button");
    b.textContent = `Play ${i + 1}`;
    b.onclick = () => {
      player.src = f + "?v=" + Date.now(); // 캐시 방지
      player.play();
    };
    buttonsDiv.appendChild(b);
  });
};
