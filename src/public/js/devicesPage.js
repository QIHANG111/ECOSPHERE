const menuItems = document.querySelectorAll(".menu-item");

menuItems.forEach(item => {
    item.addEventListener("click", () => {
        const targetPage = item.getAttribute("data-target");
        if (targetPage) window.location.href = targetPage;
    });
});

const addButton = document.getElementById('addButton');

addButton.addEventListener('click', () => {
    window.location.href = '../terms-pages/addelectric.html';
});

let currentHouseId;

async function initCurrentHouse() {
    const token = localStorage.getItem("token");
    if (!token) return alert("Please log in first.");

    try {
        const response = await fetch("/api/user/houses", {
            headers: { Authorization: `Bearer ${token}` }
        });

        const data = await response.json();
        const houses = data.houses || [];
        if (!houses.length) return alert("No houses found.");

        currentHouseId = houses[0]._id;
        const selector = document.getElementById("houseSelector");
        selector.innerHTML = "";

        houses.forEach(h => {
            const option = document.createElement("option");
            option.value = h._id;
            option.textContent = h.house_name;
            selector.appendChild(option);
        });

        selector.value = currentHouseId;
        selector.addEventListener("change", () => {
            currentHouseId = selector.value;
            renderRoomNavigation(currentHouseId);
            loadAndRenderDevices(currentHouseId);
        });

        renderRoomNavigation(currentHouseId);
        loadAndRenderDevices(currentHouseId);
    } catch (error) {
        console.error("Failed to initialize house:", error);
    }
}

async function renderRoomNavigation(houseId) {
    const navBar = document.querySelector(".selection-bar");
    navBar.innerHTML = "";

    const token = localStorage.getItem("token");
    const res = await fetch(`/api/houses/${houseId}/rooms`, {
        headers: { Authorization: `Bearer ${token}` }
    });

    const data = await res.json();
    const rooms = data.rooms || [];

    const allBtn = document.createElement("div");
    allBtn.className = "nav-box";
    allBtn.innerHTML = `<a href="#">All Devices</a>`;
    allBtn.onclick = () => loadAndRenderDevices(houseId);
    navBar.appendChild(allBtn);

    rooms.forEach(room => {
        const roomBox = document.createElement("div");
        roomBox.className = "nav-box";
        roomBox.innerHTML = `<a href="#">${room.room_name}</a>`;
        roomBox.onclick = () => loadAndRenderDevices(houseId, room._id);
        navBar.appendChild(roomBox);
    });
}

function getCategoryFromName(deviceName) {
    const categories = {
        "lamp": "lighting", "bulb": "lighting", "ceiling": "lighting",
        "door lock": "household-security", "cctv": "household-security",
        "doorbell": "household-security", "safe box": "household-security",
        "air conditioner": "air-treatment", "heater": "air-treatment",
        "humidifier": "air-treatment", "fan": "air-treatment",
        "socket": "power-switch", "switch": "power-switch",
        "remote control": "power-switch", "cooking pot": "kitchen-electronics",
        "fridge": "kitchen-electronics", "oven": "kitchen-electronics",
        "microwave": "kitchen-electronics", "kettle": "kitchen-electronics",
        "dishwasher": "kitchen-electronics", "stove": "kitchen-electronics",
        "washer": "cleaning-appliances", "vacuum robot": "cleaning-appliances"
    };

    const lower = deviceName.toLowerCase();
    for (const key in categories) {
        if (lower.includes(key)) return categories[key];
    }
    return "default";
}

function formatDeviceFileName(deviceName) {
    return deviceName.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim().replace(/\s+/g, '-') + '.svg';
}

function generateSettingsOptions(category, deviceId, isOn, brightness, temperature) {
    const controls = {
        "air-treatment": ["power", "temperature", "fan"],
        "lighting": ["power", "brightness"],
        "kitchen-electronics": ["power", "temperature"],
    }[category] || ["power"];

    let html = '';
    if (controls.includes("power")) {
        html += `
        <div class="settings-option">
            <span>Power</span>
            <label class="switch">
                <input type="checkbox" class="toggle-status" data-id="${deviceId}" ${isOn ? "checked" : ""}>
                <span class="slider round"></span>
            </label>
        </div>`;
    }
    if (controls.includes("brightness")) {
        html += `
        <div class="settings-option">
            <span>Brightness</span>
            <input type="range" min="0" max="100" value="${brightness || 50}" 
                onchange="adjustBrightness('${deviceId}', this.value)">
        </div>`;
    }
    if (controls.includes("temperature")) {
        html += `
        <div class="settings-option">
            <div class="temperature-control">
                <button onclick="adjustTemperature('${deviceId}', -1)">-</button>
                <span id="temp-${deviceId}">${temperature || 20}</span>°C
                <button onclick="adjustTemperature('${deviceId}', 1)">+</button>
            </div>
        </div>`;
    }
    return html;
}

async function loadAndRenderDevices(houseId, roomId = null) {
    const token = localStorage.getItem("token");
    const url = roomId ? `/api/houses/${houseId}/rooms/${roomId}/devices` : `/api/houses/${houseId}/devices`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    const container = document.getElementById("furnitureContainer");
    container.innerHTML = data.devices?.length ? "" : "<p style='color: gray;'>No devices in this room.</p>";

    data.devices.forEach(device => {
        const category = getCategoryFromName(device.device_name);

        container.innerHTML += `
            <div class="furniture-item">
                <div class="furniture-icon">
                        <div class="ui-menu-icon">


                    <img class="icon-image" src="/icons/${category}/${formatDeviceFileName(device.device_name)}">
                </div>        </div>
                <div class="furniture-content">
                    <div class="furniture-name">${device.device_name}</div>
                    <div class="setting-container">
                            <div class="ui-menu-icon">
     
                        <img src="../icons/device-page/setting-3.svg" class="setting-icon">   </div>
                        <div class="dropdown-menu">
                            ${generateSettingsOptions(
            category,
            device._id,
            device.status,
            device.brightness,    
            device.temperature    
        )}
                        </div>
                    </div>
                </div>
            </div>`;
    });
}
document.addEventListener("change", async e => {
    if (e.target.classList.contains("toggle-status")) {
        const deviceId = e.target.dataset.id;
        const isChecked = e.target.checked;
        const token = localStorage.getItem("token");

        const res = await fetch(`/api/update-device`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ id: deviceId, status: isChecked })
        });

        const result = await res.json();
        if (!result.success) {
            alert("Failed to update status.");
            e.target.checked = !isChecked;
        }
    }
});

window.addEventListener("click", e => {
    if (e.target.classList.contains("setting-icon")) {
        const dropdown = e.target.closest(".setting-container").querySelector(".dropdown-menu");
        dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
    } else if (!e.target.closest(".dropdown-menu")) {
        document.querySelectorAll(".dropdown-menu").forEach(menu => menu.style.display = "none");
    }
});

window.addEventListener("DOMContentLoaded", initCurrentHouse);


// 增加温度调节函数（空调设备）
async function adjustTemperature(deviceId, change) {
    const tempSpan = document.querySelector(`#temp-${deviceId}`);
    let currentTemp = parseInt(tempSpan.textContent) + change;
    currentTemp = Math.min(30, Math.max(10, currentTemp));
    tempSpan.textContent = currentTemp;

    const token = localStorage.getItem("token");
    try {
        const res = await fetch(`/api/houses/${currentHouseId}/devices/${deviceId}/temperature`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ temperature: currentTemp })
        });

        const result = await res.json();
        if (!result.success) alert("Failed to update temperature.");
    } catch (err) {
        console.error("Error updating temperature:", err);
    }
}

async function adjustBrightness(deviceId, brightnessValue) {
    const token = localStorage.getItem("token");
    try {
        const res = await fetch(`/api/houses/${currentHouseId}/devices/${deviceId}/brightness`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ brightness: parseInt(brightnessValue) })
        });

        const result = await res.json();
        if (!result.success) alert("Failed to update brightness.");
    } catch (err) {
        console.error("Error updating brightness:", err);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
        document.querySelectorAll('.furniture-item').forEach(item => {
            const nameEl = item.querySelector('.furniture-name');
            const deviceName = nameEl.textContent.toLowerCase();
            const category = getCategoryFromName(deviceName);
            const deviceId = item.querySelector(".toggle-status").dataset.id;

            const dropdownMenu = item.querySelector('.dropdown-menu');


        });
    }, 1000);
});