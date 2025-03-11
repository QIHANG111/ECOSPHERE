const container = document.getElementById('container');
const registerBtn = document.getElementById('register');
const loginBtn = document.getElementById('login');


registerBtn.addEventListener('click', () => {
    container.classList.add("active");
});

loginBtn.addEventListener('click', () => {
    container.classList.remove("active");
});

document.addEventListener("DOMContentLoaded", function () {
    const signInForm = document.querySelector(".sign-in form");

    signInForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const email = signInForm.querySelector('input[type="email"]').value;
        const password = signInForm.querySelector('input[type="password"]').value;

        try {
            const response = await fetch("http://localhost:8000/api/signin", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ email, password })
            });

            const result = await response.json();

            if (response.ok) {
                alert("success");
                window.location.href = "/dashboard";
            } else {
                alert("failed：" + result.message);
            }
        } catch (error) {
            console.error("error", error);
            alert("server error");
        }
    });
});