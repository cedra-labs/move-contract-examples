const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const userStatus = document.getElementById("user-status");
const userAvatar = document.getElementById("user-avatar");

loginBtn.onclick = () => {
  window.location.href = "/auth/google";
};

logoutBtn.onclick = async () => {
  await fetch("/auth/logout");
  window.location.reload();
};

async function checkAuth() {
  try {
    const res = await fetch("/auth/me");
    const data = await res.json();

    if (data.user) {
      // Logged in
      loginBtn.style.display = "none";
      logoutBtn.style.display = "inline-block";
      userStatus.textContent = data.user.name || data.user.email;

      if (data.user.avatar) {
        userAvatar.src = data.user.avatar;
        userAvatar.style.display = "block";
      }

      // NEW: Tell app.js to load conversations now that we are logged in
      if (typeof loadSidebar === "function") {
        loadSidebar();
      }
      
    } else {
      // Guest
      loginBtn.style.display = "inline-block";
      logoutBtn.style.display = "none";
      userStatus.textContent = "Guest";
      userAvatar.style.display = "none";
    }
  } catch (err) {
    console.error("Auth check failed", err);
    userStatus.textContent = "Guest";
  }
}

checkAuth();