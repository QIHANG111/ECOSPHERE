document.addEventListener("DOMContentLoaded", async function () {
    const addUserForm = document.getElementById("addUserForm");
    const modal = document.getElementById("addUserModal");
    const addUserBtn = document.getElementById("addUserBtn");
    const userListContainer = document.getElementById("userListContainer");
    const houseListContainer = document.getElementById("houseListContainer");

    const token = localStorage.getItem("token");
    if (!token) {
        alert("Please log in first.");
        window.location.href = "/pages/signinPage.html";
        return;
    }

    let currentUserRole = "";
    let currentUserId = "";

    try {
        const response = await fetch("/api/user", {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}` }
        });

        const user = await response.json();
        if (response.ok) {
            console.log("[DEBUG] Current User:", user);

            currentUserId = user._id;
            currentUserRole = user.role_id?.role_name || "";

            addUserToAvatarList(user);
            addUserToList(user, true, currentUserId);

            addHouseToList(user,currentUserId);

            fetchSubUsers(user._id);

            if (currentUserRole === "Home Dweller") {
                console.log("[INFO] Hiding user options for Home Dweller");

                // Hide "Add User" button
                if (addUserBtn) addUserBtn.style.display = "none";

                // Hide all settings buttons
                document.querySelectorAll(".settings-btn").forEach(btn => btn.style.display = "none");
            }
        } else {
            alert("Session expired, please log in again.");
            localStorage.removeItem("token");
            window.location.href = "/pages/signinPage.html";
        }
    } catch (error) {
        console.error("[ERROR] Fetching user failed:", error);
        alert("Server error. Please try again later.");
    }

    addUserBtn?.addEventListener("click", function () {
        modal.style.display = "block";
    });

    addUserForm?.addEventListener("submit", function (event) {
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

    function addHouseToList(user, currentUserId) {
        const houseListContainer = document.getElementById("houseListContainer");
        houseListContainer.innerHTML = "";

        const houses = user.houses || [];

        if (houses.length === 0) {
            const emptyMessage = document.createElement("p");
            emptyMessage.textContent = "No houses associated with your account.";
            houseListContainer.appendChild(emptyMessage);
            return;
        }

        houses.forEach(house => {
            const listItem = document.createElement("div");
            listItem.classList.add("house-list-item");

            listItem.innerHTML = `
                            <div class="ui-menu-icon">
  <img src="/icons/house-2-svgrepo-com.svg"" alt="House Icon" width="40" height="40">
                </div>
            <div class="user-info">
                <p class="user-name">${house.house_name}</p>
                <p class="user-role">House ID: ${house._id}</p>
            </div>
            <div style="align-content: end">
                <div class="ui-menu-icon">
                    <img src="/icons/setting-3-svgrepo-com.svg" 
                         data-house-id="${house._id}" 
                         alt="House Settings Icon" 
                         width="30" height="30" 
                         class="house-settings-btn">
                </div>
            </div>
        `;

            houseListContainer.appendChild(listItem);

            const settingsBtn = listItem.querySelector(".house-settings-btn");
            settingsBtn.addEventListener("click", () => {
                showHouseSettings(house);
            });
        });
    }


    function addUserToList(user, isMainUser = false, currentUserId) {
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

        listItem.dataset.userId = user._id;

        userListContainer.appendChild(listItem);

        const settingsBtn = listItem.querySelector(".settings-btn");


        if (currentUserRole === "Home Dweller") {
            settingsBtn.style.display = "none";
        } else if (currentUserRole === "Home Owner" && user._id !== currentUserId) {
            settingsBtn.style.display = "block";
        } else {
            settingsBtn.style.display = "none";
        }

        settingsBtn.addEventListener("click", () => showUserSettings(user));
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
                    addUserToList(subUser, false, currentUserId);
                });
            }
        } catch (error) {
            console.error("[ERROR] Fetching sub-users failed:", error);
        }
    }
});




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
            addUserToList(result.data, false, user._id);
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

function addUserToAvatarList(user) {
    const avatarUrl = `https://randomuser.me/api/portraits/lego/${user.user_avatar || 1}.jpg`;
    const avatar = document.createElement("div");
    avatar.classList.add("avatar");
    avatar.innerHTML = `<img src="${avatarUrl}" alt="${user.name}">`;

    document.getElementById("avatarList").appendChild(avatar);
}

function showUserSettings(user) {
    document.getElementById("userSettingsModal").style.display = "block";
    document.getElementById("settingsAvatar").src = `https://randomuser.me/api/portraits/lego/${user.user_avatar || 1}.jpg`;
    document.getElementById("settingsUserName").innerText = user.name;
    document.getElementById("settingsUserName").dataset.userId = user._id; // Add this line
    document.getElementById("settingsUserEmail").innerText = user.email;
    document.getElementById("settingUserRole").innerText = user.role_id?.role_name || "User";
    const roleSelector = document.getElementById("roleSelector");
    roleSelector.value = user.role_id === "1" ? "1" : "2";

    document.getElementById("changeRoleBtn").onclick = () => changeUserRole(user._id);
}

function showHouseSettings(house) {
    document.getElementById("houseSettingsModal").style.display = "block";
    document.getElementById("settingsHouseName").innerText = house.house_name;
    document.getElementById("settingsHouseId").innerText = house._id;
}

document.getElementById("closeUserSettings").onclick = () => {
    document.getElementById("userSettingsModal").style.display = "none";
};

document.getElementById("closeHouseSettings").onclick = () => {
    document.getElementById("houseSettingsModal").style.display = "none";
}

function closeAddUserModal() {
    document.getElementById("addUserModal").style.display = "none";
    document.getElementById("addUserForm").reset();
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

async function deleteSubUser(userId) {
    try {
        const response = await fetch(`/api/users/${userId}`, {
            method: "DELETE",
        });

        if (response.ok) {
            alert("User deleted successfully.");
            location.reload();
        } else {
            const result = await response.json();
            alert("Failed to delete user: " + result.message);
        }
    } catch (error) {
        console.error("[ERROR] Deleting user failed:", error);
        alert("Server error.");
    }
}

async function deleteHouse(houseId) {
    try {
        const response = await fetch(`/api/houses/${houseId}/delete-house`, {
            method: "DELETE",
            headers: {
                'Authorization': `Bearer ${localStorage.getItem("token")}`
            }
        });

        if (response.ok) {
            alert("House deleted successfully.");
            location.reload();
        } else {
            const result = await response.json();
            alert("Failed to delete house: " + result.message);
        }
    } catch (error) {
        console.error("[ERROR] Deleting house failed:", error);
        alert("Server error.");
    }
}


document.getElementById("deleteHouseBtn").onclick = () => {
    const houseId = document.getElementById("settingsHouseId").innerText;
    console.log("House ID:", houseId);
    if (houseId) {
        if (confirm("Are you sure you want to delete this house?")) {
            deleteHouse(houseId).then(r => console.log(r));
        }
    } else {
        alert("House ID is not defined.");
    }
}


async function changeUserRole(userId) {
    const roleSelector = document.getElementById("roleSelector");
    const newRoleId = roleSelector.value;

    try {
        const response = await fetch(`/api/users/${userId}/assign-role`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem("token")}`
            },
            body: JSON.stringify({ roleId: newRoleId })
        });

        const result = await response.json();

        if (response.ok) {
            alert("Role updated successfully.");
            document.getElementById("userSettingsModal").style.display = "none";
            location.reload();
        } else {
            alert("Failed to update role: " + result.error);
        }
    } catch (error) {
        console.error("[ERROR] Role update failed:", error);
        alert("Server error.");
    }
}

document.getElementById("closeUserSettings").onclick = () => {
    document.getElementById("userSettingsModal").style.display = "none";
};


// JavaScript to handle opening and closing the 'Add House' modal
function openAddHouseModal() {
    document.getElementById('addHouseModal').style.display = 'block';
}

function closeAddHouseModal() {
    document.getElementById('addHouseModal').style.display = 'none';
    // Reset the form fields on close
    document.getElementById('addHouseForm').reset();
}

// Event listener for the button that opens the modal
document.getElementById('addHouseBtn').addEventListener('click', openAddHouseModal);

// Async function to add a new house
async function addHouse() {
    try {
        console.log("[DEBUG] Starting addHouse function");

        const houseNameInput = document.getElementById('houseName');
        const newHouseName = houseNameInput.value.trim();

        if (!newHouseName) {
            alert("Please provide a valid House Name.");
            return;
        }

        const token = localStorage.getItem('token');
        if (!token) {
            alert("No token found. Please sign in again.");
            return;
        }

        const response = await fetch(`/api/houses`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ house_name: newHouseName })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("[ERROR] Failed to add house:", errorData);
            throw new Error(errorData.message || "Failed to add house");
        }

        const data = await response.json();
        console.log("[DEBUG] House created successfully:", data);

        alert("House created successfully!");
        closeAddHouseModal();

        window.location.reload();

    } catch (err) {
        console.error("Error adding house:", err);
        alert(err.message);
    }
}

// Attach a 'submit' event listener to the form, not the button
document.getElementById('addHouseForm').addEventListener('submit', function (event) {
    event.preventDefault();
    addHouse().then(r => console.log(r));
});