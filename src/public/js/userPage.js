document.addEventListener("DOMContentLoaded", async function () {
    const addUserForm = document.getElementById("addUserForm");
    const modal = document.getElementById("addUserModal");
    const addUserBtn = document.getElementById("addUserBtn");

    const token = localStorage.getItem("token");
    if (!token) {
        alert("Please log in first.");
        window.location.href = "/pages/signinPage.html";
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


            addUserToAvatarList(user);
            addUserToList(user, true);


            fetchSubUsers(user._id);
        } else {
            alert("Session expired, please log in again.");
            localStorage.removeItem("token");
            window.location.href = "/pages/signinPage.html";
        }
    } catch (error) {
        console.error("[ERROR] Fetching user failed:", error);
        alert("Server error. Please try again later.");
    }


    addUserBtn.addEventListener("click", function () {
        modal.style.display = "block";
    });

    addUserForm.addEventListener("submit", function (event) {
        event.preventDefault();
        addSubUser();
    });


    window.onclick = function (event) {
        if (event.target === modal) {
            closeAddUserModal();
        }
    };

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
            closeAddUserModal();
        }
    });
});

function closeAddUserModal() {
    document.getElementById("addUserModal").style.display = "none";
}


async function fetchSubUsers(parentUserId) {
    try {
        const response = await fetch(`/api/users/parent/${parentUserId}`);
        const data = await response.json();

        if (response.ok && data.subUsers.length > 0) {
            console.log("[DEBUG] Sub-users:", data.subUsers);

            document.querySelectorAll(".user-list-item:not(.main-user-card)").forEach(el => el.remove());

            data.subUsers.forEach(subUser => {
                addUserToAvatarList(subUser);
                addUserToList(subUser);
            });
        }
    } catch (error) {
        console.error("[ERROR] Fetching sub-users failed:", error);
    }
}


function addUserToAvatarList(user) {
    const avatarUrl = `https://randomuser.me/api/portraits/lego/${user.user_avatar || 1}.jpg`;
    const avatar = document.createElement("div");
    avatar.classList.add("avatar");
    avatar.innerHTML = `<img src="${avatarUrl}" alt="${user.name}">`;

    avatarList.appendChild(avatar);
}

function addUserToList(user, isMainUser = false) {
    const avatarUrl = `https://randomuser.me/api/portraits/lego/${user.user_avatar || 1}.jpg`;
    const listItem = document.createElement("div");
    listItem.classList.add("user-list-item");
    if (isMainUser) {
        listItem.classList.add("main-user-card");
    }

    listItem.innerHTML = `
        <div class="user-avatar">
            <img src="${avatarUrl}" alt="${user.name}">
        </div>
        <div class="user-info">
            <p class="user-name">${user.name} ${isMainUser ? "(You)" : ""}</p>
            <p class="user-role">${user.role_id?.role_name || "User"}</p>
        </div>
        <div style="align-content: end">
            <div class="ui-menu-icon">
                <img src="/icons/setting-3-svgrepo-com.svg" 
                    data-user-id="${user._id}" 
                    alt="Settings Icon" width="30" height="30" class="settings-btn">
            </div>
        </div>
    `;

    userListContainer.appendChild(listItem);


    const settingsBtn = listItem.querySelector('.settings-btn');
    settingsBtn.addEventListener('click', () => showUserSettings(user));
}


async function addSubUser() {
    const memberName = document.getElementById("name").value.trim();
    const memberEmail = document.getElementById("email").value.trim();
    const memberPassword = document.getElementById("password").value.trim();
    const userAvatar = Math.floor(Math.random() * 10);

    if (!memberName || !memberEmail || !memberPassword) {
        alert("Please fill in all fields.");
        return;
    }

    try {

        const userResponse = await fetch("/api/user", {
            method: "GET",
            headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
        });

        const user = await userResponse.json();
        if (!userResponse.ok) {
            alert("Failed to fetch current user.");
            return;
        }


        const roleResponse = await fetch("/api/getRoleId/Home Dweller");
        const roleResult = await roleResponse.json();

        if (!roleResponse.ok || !roleResult.role_id) {
            console.error("Error fetching role ID:", roleResult.message);
            alert("Error fetching role ID: " + (roleResult.message || "Unknown error"));
            return;
        }

        const roleId = roleResult.role_id;

        const response = await fetch("/api/signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: memberName,
                email: memberEmail,
                password: memberPassword,
                role_id: roleId,
                parentUser: user._id,
                user_avatar: userAvatar
            })
        });

        const result = await response.json();

        if (response.ok) {
            console.log("[DEBUG] Sub-user registered:", result.data);
            addUserToAvatarList(result.data);
            addUserToList(result.data);
        } else {
            console.error("[ERROR] Sub-user registration failed:", result.message);
            alert("Sub-user registration failed: " + result.message);
        }
    } catch (error) {
        console.error("Error:", error);
        alert("Server error");
    }

    closeAddUserModal();
}

function showUserSettings(user) {
    document.getElementById("userSettingsModal").style.display = "block";
    document.getElementById("settingsAvatar").src = `https://randomuser.me/api/portraits/lego/${user.user_avatar || 1}.jpg`;
    document.getElementById("settingsUserName").innerText = user.name;
    document.getElementById("settingsUserEmail").innerText = user.email;
    document.getElementById("settingUserRole").innerText = user.role_id?.role_name || "User";

    document.getElementById("userSettingsDetail").innerHTML = '';
}


document.getElementById("closeUserSettings").onclick = () => {
    document.getElementById("userSettingsModal").style.display = "none";
};


function showUserDetail(type) {
    let detailHTML = '';
    switch(type) {
        case 'account':
            detailHTML = `
                <h3>Update Account Information</h3>
                <input type="text" id="detailUsername" placeholder="New Username">
                <input type="email" id="detailEmail" placeholder="New Email">
                <button onclick="updateUserDetail('account')">Save Changes</button>
            `;
            break;
        case 'password':
            detailHTML = `
                <h3>Change Password</h3>
                <input type="password" id="newPassword" placeholder="New Password">
                <button onclick="updateUserDetail('password')">Change Password</button>
            `;
            break;
        case 'avatar':
            detailHTML = `
                <h3>Change Avatar</h3>
                <select id="detailAvatar">
                    ${[1,2,3,4,5,6,7,8,9].map(num => `<option value="${num}">Avatar ${num}</option>`).join('')}
                </select>
                <button onclick="updateUserDetail('avatar')">Change Avatar</button>
            `;
            break;
    }

    document.getElementById("userSettingsDetail").innerHTML = detailHTML;
}


async function updateUserDetail(type) {
    const userId = document.querySelector(".settings-btn[data-user-id]").dataset.userId;
    const updateData = {};

    if (type === 'account') {
        updateData.name = document.getElementById("detailUsername").value;
        updateData.email = document.getElementById("detailEmail").value;
    } else if (type === 'password') {
        updateData.password = document.getElementById("newPassword").value;
    } else if (type === 'avatar') {
        updateData.user_avatar = document.getElementById("detailAvatar").value;
    }

    try {
        const response = await fetch(`/api/update-user/${userId}`, {
            method: "PUT",
            headers: {
                "Authorization": `Bearer ${localStorage.getItem("token")}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(updateData)
        });

        const result = await response.json();

        if (response.ok) {
            alert("Update successful!");
            document.getElementById("userSettingsModal").style.display = "none";
            window.location.reload();
        } else {
            alert("Update failed: " + result.message);
        }
    } catch (error) {
        alert("Server error, please try again later.");
    }
}