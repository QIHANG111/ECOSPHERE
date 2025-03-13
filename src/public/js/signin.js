const container = document.getElementById("container");
const registerBtn = document.getElementById("register");
const loginBtn = document.getElementById("login");

registerBtn.addEventListener("click", () => {
    container.classList.add("active");
});

loginBtn.addEventListener("click", () => {
    container.classList.remove("active");
});

document.addEventListener("DOMContentLoaded", function () {
    const signUpForm = document.querySelector(".sign-up form");
    const signInForm = document.querySelector(".sign-in form");


    signUpForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const name = signUpForm.querySelector('input[placeholder="Name"]').value.trim();
        const email = signUpForm.querySelector('input[placeholder="Email"]').value.trim();
        const password = signUpForm.querySelector('input[placeholder="Password"]').value.trim();

        if (!name || !email || !password) {
            alert("Please fill in all fields.");
            return;
        }

        try {

            const roleResponse = await fetch("http://localhost:4000/api/getRoleId/user");
            const roleResult = await roleResponse.json();

            if (!roleResponse.ok || !roleResult.role_id) {
                console.error("Error fetching role ID:", roleResult.message);
                alert("Error fetching role ID: " + (roleResult.message || "Unknown error"));
                return;
            }

            const roleId = roleResult.role_id;  // **MongoDB ObjectId**
            console.log("[DEBUG] Retrieved role_id:", roleId);


            const requestBody = JSON.stringify({ name, email, password, role_id: roleId });
            console.log("[DEBUG] Sending signup request with body:", requestBody);

            const response = await fetch("/api/signup", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: requestBody
            });

            const result = await response.json();

            if (response.ok) {
                alert("Registration successful! Please sign in.");
                container.classList.remove("active");
            } else {
                console.error("[ERROR] Registration failed:", result.message);
                alert("Registration failed: " + result.message);
            }
        } catch (error) {
            console.error("Error:", error);
            alert("Server error");
        }
    });


    signInForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const email = signInForm.querySelector('input[placeholder="Email"]').value.trim();
        const password = signInForm.querySelector('input[placeholder="Password"]').value.trim();

        if (!email || !password) {
            alert("Please enter both email and password.");
            return;
        }

        try {
            const response = await fetch("/api/signin", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ email, password })
            });

            const result = await response.json();

            if (response.ok) {
                alert("Login successful! Redirecting to home page...");
                localStorage.setItem("token", result.token);
                window.location.href = "../pages/homePage.html";
            } else {
                console.error("[ERROR] Login failed:", result.message);
                alert("Login failed: " + result.message);
            }
        } catch (error) {
            console.error("Error:", error);
            alert("Server error");
        }
    });

});