const loginBtn = document.querySelector("#loginBtn");
const signupBtn = document.querySelector("#createBtn");
const message = document.querySelector("#message");
const loginForm = document.querySelector("form[action='/login']");
const signupForm = document.querySelector("form[action='/signup']");

if (loginBtn && loginForm) {
    loginBtn.addEventListener("click", (event) => {
        event.preventDefault();
        const email = document.querySelector("#email").value;
        const password = document.querySelector("#password").value;
        if (!message) return;
        if (email === "" || password === "") {
            message.textContent = "All fields are required!!";
            return;
        }
        message.textContent = "Logged in successfully";
        loginForm.submit();
    });
}

if (signupBtn && signupForm) {
    signupBtn.addEventListener("click", (event) => {
        event.preventDefault();
        const username = document.querySelector("#Username").value;
        const email = document.querySelector("#Email").value;
        const password = document.querySelector("#Password").value;
        if (!message) return;
        if (username === "" || password === "" || email === "") {
            message.textContent = "All fields are required!!";
            return;
        }
        if (password.length < 6) {
            message.textContent = "Password must be at least 6 characters long!!";
            return;
        }
        message.textContent = "Creating account...";
        signupForm.submit();
    });
}

const showpassword = document.querySelector("#showpassword");
if (showpassword) {
    showpassword.addEventListener("change", () => {
        const passwordInput = document.querySelector("#Password");
        if (!passwordInput) return;
        passwordInput.type = showpassword.checked ? "text" : "password";
    });
}

