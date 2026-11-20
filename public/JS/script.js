(function () {
    "use strict";

    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const MAX_FILE_BYTES = 5 * 1024 * 1024;

    const $ = (sel) => document.querySelector(sel);

    const setMessage = (el, text, type) => {
        if (!el) return;
        el.textContent = text || "";
        el.classList.remove("is-error", "is-success");
        if (text) el.classList.add(type === "success" ? "is-success" : "is-error");
    };

    const setFieldError = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text || "";
    };

    const setLoading = (btn, loading, idleText, loadingText) => {
        if (!btn) return;
        btn.disabled = loading;
        btn.textContent = loading ? loadingText : idleText;
    };

    // Password visibility toggles (eye button)
    document.querySelectorAll(".toggle-password").forEach((btn) => {
        btn.addEventListener("click", () => {
            const input = document.getElementById(btn.dataset.target);
            if (!input) return;
            const show = input.type === "password";
            input.type = show ? "text" : "password";
            btn.textContent = show ? "🙈" : "👁️";
            btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
            input.focus();
        });
    });

    // ---------- Login ----------
    const loginForm = $("form[action='/login']");
    if (loginForm) {
        const email = $("#email");
        const password = $("#password");
        const message = $("#message");
        const btn = $("#loginBtn");

        const validate = () => {
            let ok = true;

            if (!email.value.trim()) {
                setFieldError("email-error", "Email is required"); ok = false;
            } else if (!EMAIL_RE.test(email.value.trim())) {
                setFieldError("email-error", "Enter a valid email address"); ok = false;
            } else {
                setFieldError("email-error", "");
            }

            if (!password.value) {
                setFieldError("password-error", "Password is required"); ok = false;
            } else {
                setFieldError("password-error", "");
            }

            return ok;
        };

        [email, password].forEach((f) => f && f.addEventListener("input", () => {
            setFieldError(f.id + "-error", "");
            setMessage(message, "");
        }));

        loginForm.addEventListener("submit", (e) => {
            if (!validate()) {
                e.preventDefault();
                setMessage(message, "Please fix the errors above.", "error");
                return;
            }
            setMessage(message, "Logging in…", "success");
            setLoading(btn, true, "Log in", "Logging in…");
        });
    }

    // ---------- Signup ----------
    const signupForm = $("form[action='/signup']");
    if (signupForm) {
        const username = $("#Username");
        const email = $("#Email");
        const password = $("#Password");
        const profile = $("#Profile");
        const message = $("#message");
        const btn = $("#createBtn");

        const validate = () => {
            let ok = true;

            const u = username.value.trim();
            if (!u) {
                setFieldError("username-error", "Username is required"); ok = false;
            } else if (u.length < 3) {
                setFieldError("username-error", "Username must be at least 3 characters"); ok = false;
            } else {
                setFieldError("username-error", "");
            }

            if (!email.value.trim()) {
                setFieldError("email-error", "Email is required"); ok = false;
            } else if (!EMAIL_RE.test(email.value.trim())) {
                setFieldError("email-error", "Enter a valid email address"); ok = false;
            } else {
                setFieldError("email-error", "");
            }

            if (!password.value) {
                setFieldError("password-error", "Password is required"); ok = false;
            } else if (password.value.length < 6) {
                setFieldError("password-error", "Password must be at least 6 characters"); ok = false;
            } else {
                setFieldError("password-error", "");
            }

            if (profile && profile.files.length > 0) {
                const file = profile.files[0];
                if (!file.type.startsWith("image/")) {
                    setFieldError("profile-error", "Profile picture must be an image file"); ok = false;
                } else if (file.size > MAX_FILE_BYTES) {
                    setFieldError("profile-error", "Image must be 5MB or smaller"); ok = false;
                } else {
                    setFieldError("profile-error", "");
                }
            } else {
                setFieldError("profile-error", "");
            }

            return ok;
        };

        [username, email, password].forEach((f) => f && f.addEventListener("input", () => {
            setFieldError(f.id.toLowerCase() + "-error", "");
            setMessage(message, "");
        }));

        if (profile) {
            profile.addEventListener("change", () => {
                setFieldError("profile-error", "");
                setMessage(message, "");
            });
        }

        signupForm.addEventListener("submit", (e) => {
            if (!validate()) {
                e.preventDefault();
                setMessage(message, "Please fix the errors above.", "error");
                return;
            }
            setMessage(message, "Creating your account…", "success");
            setLoading(btn, true, "Create account", "Creating…");
        });
    }
})();
