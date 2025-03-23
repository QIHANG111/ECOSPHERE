function openPopout() {
    document.getElementById("roomModal").style.display = "flex";
}

function closeModal() {
    document.getElementById("roomModal").style.display = "none";
    document.getElementById("roomName").value = "";
    document.getElementById("houseSelector").selectedIndex = 0;
}

async function saveRoom() {
    const roomName = document.getElementById("roomName").value.trim();
    const houseId = document.getElementById("houseSelector").value;
    if (!roomName || !houseId) {
        alert("Please enter a room name and select a house.");
        return;
    }
    const token = getAuthToken();
    try {
        const response = await fetch(`/api/houses/${houseId}/rooms/add-room`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ room_name: roomName })
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || "Failed to add room.");
        }
        alert("Room added successfully!");
        closeModal();
        renderRooms();
    } catch (error) {
        console.error("Error saving room:", error);
        alert("Failed to add room: " + error.message);
    }
}

async function removeRoom(roomId) {
    const token = getAuthToken();
    if (!confirm("Are you sure you want to delete this room?")) return;
    try {
        const res = await fetch(`/api/rooms/${roomId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
        });
        const result = await res.json();
        if (!res.ok) {
            throw new Error(result.error || "Failed to delete room");
        }
        renderRooms();
        alert("Room deleted successfully!");
    } catch (error) {
        console.error("Error deleting room:", error);
        alert("Failed to delete room: " + error.message);
    }
}

async function fetchRooms() {
    const token = getAuthToken();
    try {
        const response = await fetch('/api/rooms', {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        return data.rooms || data || [];
    } catch (error) {
        console.error("Error fetching rooms:", error);
        return [];
    }
}

async function renderRooms() {
    const container = document.getElementById("roomCard");
    if (!container) return;
    const rooms = await fetchRooms();
    container.innerHTML = `
        <div class="leftToRightList"> 
            <h3 style="padding-left: 10vw">Rooms</h3>
            <button class="hidden-button ui-menu-icon" style="width: 5vw; height: 3.5vw" id="automation" onclick="openPopout()">
                <img src="/icons/add-cross.svg" alt="Vector Icon" width="30" height="30">
            </button>
        </div>
        <div id="roomList"></div>
    `;
    const roomList = document.getElementById("roomList");
    if (!rooms.length) {
        roomList.innerHTML = "<p style='color: gray; text-align: center;'>No rooms.</p>";
        return;
    }
    rooms.forEach(room => {
        const roomItem = document.createElement("div");
        roomItem.classList.add("hBar");
        const nameSpan = document.createElement("span");
        nameSpan.textContent = room.room_name;
        nameSpan.style.marginRight = "10px";
        const typeSmall = document.createElement("small");
        typeSmall.style.opacity = "0.7";
        typeSmall.style.fontSize = "0.8em";
        typeSmall.style.display = "block";
        typeSmall.textContent = room.house.house_name;
        const settingsBtn = document.createElement("button");
        settingsBtn.style.background = "transparent";
        settingsBtn.style.color = "white";
        settingsBtn.style.border = "none";
        settingsBtn.style.cursor = "pointer";
        settingsBtn.innerHTML = `
            <div class="ui-menu-icon" style="margin-left: 12vw">
                <img src="/icons/setting-3-svgrepo-com.svg" alt="Vector Icon" width="30" height="30">
            </div>
        `;
        settingsBtn.onclick = () => {
            showRoomSettings(room._id, room.house._id || room.house);
        };
        roomItem.appendChild(nameSpan);
        roomItem.appendChild(typeSmall);
        roomItem.appendChild(settingsBtn);
        roomList.appendChild(roomItem);
    });
}

function getAuthToken() {
    return localStorage.getItem("token") || sessionStorage.getItem("token");
}

async function loadHouseOptions() {
    const token = getAuthToken();
    const houseSelector = document.getElementById("houseSelector");
    try {
        const res = await fetch('/api/user/houses', {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        houseSelector.innerHTML = '';
        data.houses.forEach(h => {
            const option = document.createElement('option');
            option.value = h._id;
            option.textContent = h.house_name;
            houseSelector.appendChild(option);
        });
    } catch (error) {
        console.error("Failed to load houses:", error);
    }
}

function toggleSaveButton() {
    const input = document.getElementById("roomName");
    const button = document.querySelector(".save");
    if (input.value.trim()) {
        button.classList.add("enabled");
        button.onclick = saveRoom;
    } else {
        button.classList.remove("enabled");
        button.onclick = null;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    renderRooms();
    loadHouseOptions();
});

async function closeRoomSettings() {
    document.getElementById("roomSettingModal").style.display = "none";
}

async function showRoomSettings(roomId, houseId) {
    const modal = document.getElementById("roomSettingModal");
    const deviceListContainer = document.getElementById("roomDeviceList");

    if (!deviceListContainer) return;
    deviceListContainer.innerHTML = "<p>Loading devices...</p>";
    modal.style.display = "flex";
    const token = localStorage.getItem("token");
    if (!token) {
        alert("Session expired, please log in again.");
        window.location.href = "/pages/signinPage.html";
        return;
    }

    try {
        const response = await fetch(`/api/houses/${houseId}/rooms/${roomId}/devices`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const roomResponse = await fetch(`/api/houses/${houseId}/rooms`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const roomResult = await roomResponse.json();
        const roomOptions = roomResult.rooms || [];
        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.error || "Failed to fetch devices");
        }

        const devices = result.devices;
        if (!devices.length) {
            deviceListContainer.innerHTML = "<p>No devices in this room.</p>";
            return;
        }

        let html = `
            <div class="leftToRightList" style="margin-bottom: 1em;">
                <input type="text" id="renameRoomInput" placeholder="Enter new room name" style="width: 60%; padding: 5px;" />
                <button onclick="renameRoom('${roomId}', '${houseId}')" style="margin-left: 5px; width: 6vw">Rename</button>
            </div>
        `;

        html += `<div id="scrollDeviceList">`;

        devices.forEach(device => {
            const deviceRoomId = device.room;
            const roomSelector = `
                <select class="room-selector" onchange="updateDeviceRoom('${device._id}', this.value)">
                    ${roomOptions.map(r => `
                        <option value="${r._id}" ${r._id === deviceRoomId ? 'selected' : ''}>
                            ${r.room_name}
                        </option>
                    `).join("")}
                </select>
            `;

            html += `
                <div class="hBar">
                    <span><strong>${device.device_name}</strong> (${device.device_type})</span>
                    ${roomSelector}
                </div>
            `;
        });

        html += `</div>`;
        deviceListContainer.innerHTML = html;
    } catch (error) {
        console.error("[ERROR] Failed to fetch room devices:", error);
        deviceListContainer.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
    }
}


async function updateDeviceRoom(deviceId, newRoomId) {
    const token = localStorage.getItem("token");
    try {
        const res = await fetch(`/api/devices/${deviceId}/update-room`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ newRoomId })
        });
        const result = await res.json();
        if (!res.ok) {
            throw new Error(result.error || "Failed to update device room.");
        }
        alert("Device room updated successfully.");
    } catch (error) {
        console.error("[ERROR] Updating device room:", error);
        alert("Failed to update device room: " + error.message);
    }
}

async function renameRoom(roomId, houseId) {
    const newName = document.getElementById("renameRoomInput").value.trim();
    if (!newName) {
        alert("Room name cannot be empty.");
        return;
    }
    const token = localStorage.getItem("token");
    try {
        const res = await fetch(`/api/houses/${houseId}/rooms/${roomId}/rename`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ room_name: newName })
        });
        const result = await res.json();
        if (!res.ok) {
            throw new Error(result.error || "Failed to rename room.");
        }
        alert("Room name updated successfully.");
        renderRooms();
        showRoomSettings(roomId, houseId);
    } catch (error) {
        console.error("[ERROR] Renaming room:", error);
        alert("Error: " + error.message);
    }
}