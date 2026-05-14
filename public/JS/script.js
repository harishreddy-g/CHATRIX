const loginBtn = document.querySelector("#loginBtn");
const message = document.querySelector("#message");
if (loginBtn) {
    loginBtn.addEventListener("click", (event) => {
        event.preventDefault();
        const email = document.querySelector("#Email").value;
        const password = document.querySelector("#Password").value;
        if (!message) return;
        if (email === "" || password === "") {
            message.textContent = "All fields are required!!";
        } else {
            message.textContent = "Logged in successfully";
        }
    });
}

const signupBtn = document.querySelector("#createBtn");

if (signupBtn) {
    signupBtn.addEventListener("click", (event) => {
        event.preventDefault();
        const username = document.querySelector("#Username").value;
        const email = document.querySelector("#Email").value;
        const password = document.querySelector("#Password").value;
        if (!message) return;
        if (username === "" || password === "" || email === "") {
            message.textContent = "All fields are required!!";
        }else if(password.length < 6){
            message.textContent = "Password must be at least 6 characters long!!";
        }


         else {
            message.textContent = "Account created";
        }
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

