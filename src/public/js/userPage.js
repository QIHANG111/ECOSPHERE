document.addEventListener("DOMContentLoaded", async function () {
    const addMemberForm = document.getElementById("addMemberForm");
    const modal = document.getElementById("addMemberModal");
    const userInfoContainer = document.getElementById("userInfo");
    const circleContainer = document.querySelector(".circle-container");

    const token = localStorage.getItem("token");
    if (!token) {
        alert("Please log in first.");
        window.location.href = "../pages/signinPage.html";
        return;
    }

    try {
        // get user info
        const response = await fetch("/api/user", {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}` }
        });

        const user = await response.json();
        if (response.ok) {
            console.log("[DEBUG] Current User:", user);
            const mainUserImage = document.getElementById("mainUserImage");
            if (mainUserImage) {
                mainUserImage.src = `https://randomuser.me/api/portraits/lego/${user.user_avatar || 1}.jpg`;
            }
            userInfoContainer.innerHTML = `<strong> ${user.name} </strong>`;
            fetchSubUsers(user._id);
        } else {
            alert("Session expired, please log in again.");
            localStorage.removeItem("token");
            window.location.href = "../pages/signinPage.html";
        }
    } catch (error) {
        alert("Server error. Please try again later.");
    }

    // add sub user manually
    addMemberForm.addEventListener("submit", function (event) {
        event.preventDefault();
        addSubUser();
    });

    window.onclick = function (event) {
        if (event.target === modal) {
            closeAddModal();
        }
    };

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
            closeAddModal();
        }
    });
});

// get sub users
async function fetchSubUsers(parentUserId) {
    try {
        const response = await fetch(`/api/users/parent/${parentUserId}`);
        const data = await response.json();

        if (response.ok && data.subUsers.length > 0) {
            console.log("[DEBUG] Sub-users:", data.subUsers);

            document.querySelectorAll(".small-circle").forEach(el => el.remove());

            data.subUsers.forEach(subUser => {
                const avatarUrl = `https://randomuser.me/api/portraits/lego/${subUser.user_avatar || 1}.jpg`;
                addSmallCircle(subUser.name, avatarUrl);
            });

            positionSmallCircles();
        }
    } catch (error) {
        console.error("[ERROR] Fetching sub-users failed:", error);
    }
}

function addSmallCircle(name, imageUrl) {
    const smallCircle = document.createElement("div");
    smallCircle.classList.add("small-circle");
    smallCircle.innerHTML = `<img src="${imageUrl || 'https://randomuser.me/api/portraits/lego/1.jpg'}" alt="${name}" title="${name}">`;

    document.querySelector(".circle-container").appendChild(smallCircle);
}

function positionSmallCircles() {
    const smallCircles = document.querySelectorAll(".small-circle");
    const total = smallCircles.length;
    if (total === 0) return;

    const containerRect = document.querySelector(".circle-container").getBoundingClientRect();
    const parentCenterX = containerRect.width / 2;
    const parentCenterY = containerRect.height / 2;

    const radius = Math.min(200, containerRect.width / 3);

    smallCircles.forEach((circle, index) => {
        let angle = (index / total) * 2 * Math.PI;
        if (total === 1) angle = 0;

        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;

        circle.style.position = "absolute";
        circle.style.transform = `translate(${parentCenterX + x}px, ${parentCenterY + y}px) translate(-50%, -50%)`;
    });
}

// add sub user
async function addSubUser() {
    const memberName = document.getElementById("memberName").value.trim();
    const memberEmail = document.getElementById("memberEmail").value.trim();
    const memberPassword = document.getElementById("memberPassword").value.trim();
    const userAvatar = Math.floor(Math.random() * 10); // 随机生成 0-9 之间的数字

    if (!memberName || !memberEmail || !memberPassword) {
        alert("Please fill in all fields.");
        return;
    }

    const userResponse = await fetch("/api/user", {
        method: "GET",
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
    });

    const user = await userResponse.json();

    if (userResponse.ok) {
        try {
            const roleResponse = await fetch("/api/getRoleId/user");
            const roleResult = await roleResponse.json();

            if (!roleResponse.ok || !roleResult.role_id) {
                console.error("Error fetching role ID:", roleResult.message);
                alert("Error fetching role ID: " + (roleResult.message || "Unknown error"));
                return;
            }

            const roleId = roleResult.role_id;

            const requestBody = JSON.stringify({
                name: memberName,
                email: memberEmail,
                password: memberPassword,
                role_id: roleId,
                parentUser: user._id,
                user_avatar: userAvatar // 存储 user_avatar
            });

            console.log("[DEBUG] Sending sub-user signup request with body:", requestBody);

            const response = await fetch("/api/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: requestBody
            });

            const result = await response.json();

            if (response.ok) {
                console.log("[DEBUG] Sub-user registered:", result.data);
                const memberImage = `https://randomuser.me/api/portraits/lego/${userAvatar}.jpg`;
                addSmallCircle(memberName, memberImage);
                positionSmallCircles();
            } else {
                console.error("[ERROR] Sub-user registration failed:", result.message);
                alert("Sub-user registration failed: " + result.message);
            }
        } catch (error) {
            console.error("Error:", error);
            alert("Server error");
        }
    }
    closeAddModal();
}