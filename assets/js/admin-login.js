if (sessionStorage.getItem("admin_token")) location.href = "dashboard.html";
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const loginButton = document.getElementById("login-button");
loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  loginError.hidden = true;
  loginButton.disabled = true;
  loginButton.textContent = "Connexion…";
  try {
    const result = await callApi("adminLogin", {
      username: document.getElementById("username").value.trim(),
      password: document.getElementById("password").value
    });
    if (result.error) throw new Error(result.error);
    sessionStorage.setItem("admin_token", result.token);
    location.href = "dashboard.html";
  } catch (error) {
    loginError.textContent = error.message || "Connexion impossible.";
    loginError.hidden = false;
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = "Se connecter →";
  }
});
