document.addEventListener("DOMContentLoaded", async function () {
    const rootElement = document.documentElement;
    const lightTheme = document.getElementById("light-theme");
    const darkTheme = document.getElementById("dark-theme");
    const blackTheme = document.getElementById("black-theme");
    const usernameInput = document.getElementById("username");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const avatarSelector = document.getElementById("avatarSelector");
    const updateUserBtn = document.getElementById("updateUserBtn");
    const currentUsername = document.getElementById("currentUsername");
    const currentEmail = document.getElementById("currentEmail");
    const currentAvatar = document.getElementById("currentAvatar");

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
        window.location.href = "../pages/signinPage.html"; // No token
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
            currentUsername.innerText = user.name;
            currentEmail.innerText = user.email;
            avatarSelector.value = user.user_avatar || 1;
            currentAvatar.src = `https://randomuser.me/api/portraits/lego/${user.user_avatar || 1}.jpg`;
        } else {
            console.error("[ERROR] Fetching user:", user.message);
            alert("Session expired, please log in again.");
            localStorage.removeItem("token");
            window.location.href = "../pages/signinPage.html";
        }
    } catch (error) {
        console.error("[ERROR] Fetching user:", error);
        alert("Server error. Please try again later.");
    }


    avatarSelector.addEventListener("change", function () {
        const selectedAvatar = avatarSelector.value;
        currentAvatar.src = `https://randomuser.me/api/portraits/lego/${selectedAvatar}.jpg`;
    });


    updateUserBtn.addEventListener("click", async function (event) {
        event.preventDefault();

        const updatedUser = {
            name: usernameInput.value,
            email: emailInput.value,
            password: passwordInput.value || undefined,
            user_avatar: parseInt(avatarSelector.value) // 更新头像
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
                alert("updated successfully!");
                currentUsername.innerText = updatedUser.name;
                currentEmail.innerText = updatedUser.email;
                currentAvatar.src = `https://randomuser.me/api/portraits/lego/${updatedUser.user_avatar}.jpg`;
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
function showDetails(id) {
    history.pushState({ section: id }, "", `#${id}`);
    document.getElementById('menu').style.display = 'none';
    document.getElementById(id).style.display = 'block';
}

function showMenu() {
    history.pushState(null, "", window.location.pathname);
    document.querySelectorAll('.details2').forEach(detail => detail.style.display = 'none');
    document.getElementById('menu').style.display = 'block';
}

document.addEventListener("DOMContentLoaded", function () {
    const logoutBtn = document.getElementById("logout-btn");

    if (logoutBtn) {
        logoutBtn.addEventListener("click", function () {
            localStorage.removeItem("token");  //  clear token
            alert("You have been logged out.");
            window.location.href = "../pages/signinPage.html";
        });}

    });
