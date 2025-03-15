document.addEventListener("DOMContentLoaded", async function () {
    const rootElement = document.documentElement;
    const lightTheme = document.getElementById("light-theme");
    const darkTheme = document.getElementById("dark-theme");
    const blackTheme = document.getElementById("black-theme");
    const usernameInput = document.getElementById("username");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const saveBtn = document.querySelector(".save-btn");

    const savedTheme = localStorage.getItem("selectedTheme");
    if (savedTheme) {
        rootElement.classList.add(savedTheme);
        if (savedTheme === "dark-theme") darkTheme.checked = true;
        else if (savedTheme === "black-theme") blackTheme.checked = true;
        else lightTheme.checked = true;
    }

    function switchTheme(theme) {
        rootElement.classList.remove("light-theme", "dark-theme", "black-theme");
        if (theme !== "light-theme") {
            rootElement.classList.add(theme);
        }
        localStorage.setItem("selectedTheme", theme);
    }

    lightTheme.addEventListener("change", () => switchTheme("light-theme"));
    darkTheme.addEventListener("change", () => switchTheme("dark-theme"));
    blackTheme.addEventListener("change", () => switchTheme("black-theme"));


    const token = localStorage.getItem("token");
    if (!token) {
        alert("Please log in first.");
        window.location.href = "../pages/signinPage.html"; //no token
        return;
    }

    try {
        const response = await fetch("/api/user", {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}` }
        });

        const user = await response.json();

        if (response.ok) {
            console.log("[DEBUG] Current User:", user);
            usernameInput.value = user.name;
            emailInput.value = user.email;
        } else {
            console.error("[ERROR] Fetching user:", user.message);
            alert("Session expired, please log in again.");
            localStorage.removeItem("token");
            window.location.href = "../pages/login.html";
        }
    } catch (error) {
        console.error("[ERROR] Fetching user:", error);
        alert("Server error. Please try again later.");
    }


    saveBtn.addEventListener("click", async function (event) {
        event.preventDefault();

        const updatedUser = {
            name: usernameInput.value,
            email: emailInput.value,
            password: passwordInput.value || undefined
        };

        try {
            const response = await fetch("/api/update-user", {
                method: "PUT",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(updatedUser)
            });

            const result = await response.json();

            if (response.ok) {
                alert("Account updated successfully!");
            } else {
                console.error("[ERROR] Updating user:", result.message);
                alert("Failed to update account: " + result.message);
            }
        } catch (error) {
            console.error("[ERROR] Updating user:", error);
            alert("Server error. Please try again later.");
        }
    });
});
document.addEventListener("DOMContentLoaded", function () {
    const logoutBtn = document.getElementById("logout-btn");

    if (logoutBtn) {
        logoutBtn.addEventListener("click", function () {
            localStorage.removeItem("token");  //  clear token
            alert("You have been logged out.");
            window.location.href = "../pages/signinPage.html";
        });
    }
});

document.addEventListener("DOMContentLoaded", async function () {
    const token = localStorage.getItem("token");

    if (!token) {
        alert("Please log in first.");
        window.location.href = "../pages/signinPage.html";
        return;
    }

    try {
        const response = await fetch("/api/user", {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}` }
        });

        const user = await response.json();

        if (response.ok) {
            const avatarImg = document.getElementById("currentAvatar");
            avatarImg.src = `https://randomuser.me/api/portraits/lego/${user.user_avatar || 1}.jpg`;

            const avatarSelector = document.getElementById("avatarSelector");
            avatarSelector.value = user.user_avatar || 1;
        } else {
            alert("Failed to load user info.");
        }
    } catch (error) {
        console.error("Error fetching user info:", error);
    }


    document.getElementById("avatarSelector").addEventListener("change", function () {
        const selectedAvatar = this.value;
        document.getElementById("currentAvatar").src = `https://randomuser.me/api/portraits/lego/${selectedAvatar}.jpg`;
    });


    document.getElementById("updateAvatarBtn").addEventListener("click", async function () {
        const selectedAvatar = document.getElementById("avatarSelector").value;

        try {
            const updateResponse = await fetch("/api/update-user", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ user_avatar: parseInt(selectedAvatar) })
            });

            const updateResult = await updateResponse.json();

            if (updateResponse.ok) {
                alert("Avatar updated successfully!");
            } else {
                alert("Failed to update avatar: " + updateResult.message);
            }
        } catch (error) {
            console.error("Error updating avatar:", error);
            alert("Server error.");
        }
    });
});