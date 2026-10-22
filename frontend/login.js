document.addEventListener("DOMContentLoaded", async () => {
    const form = document.getElementById("loginForm");
    const message = document.getElementById("loginMessage");
    const role = form.dataset.role;
    try {
        const result = await PortalAPI.me();
        if (result.user.role === role) location.replace(role === "admin" ? "admin.html" : "teacher.html");
    } catch (_) {}
    form.addEventListener("submit", async event => {
        event.preventDefault();
        message.className = "message";
        const button = form.querySelector("button[type=submit]");
        button.disabled = true;
        button.textContent = "Signing in…";
        try {
            const result = await PortalAPI.login(role, form.identifier.value, form.password.value);
            location.replace(result.user.role === "admin" ? "admin.html" : "teacher.html");
        } catch (error) {
            message.textContent = error.message;
            message.className = "message show error";
            button.disabled = false;
            button.innerHTML = `Sign in to ${role} panel <i class="fa-solid fa-arrow-right"></i>`;
        }
    });
});
