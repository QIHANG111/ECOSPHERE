const menuItems = document.querySelectorAll(".menu-item");


menuItems.forEach((item) => {
    item.addEventListener("click", () => {
        const targetPage = item.getAttribute("data-target");

        //redirect to the target page
        if (targetPage) {
            window.location.href = targetPage;
        }
    });
});



const addButton = document.getElementById('addButton');

addButton.addEventListener('click', function () {
    window.location.href = '../terms-pages/addelectric.html';
});





//don't change this

// ✅ 保留：初始化 house + room
async function initCurrentHouse() {
    const token = localStorage.getItem("token");
    if (!token) {
        alert("Please log in first.");
        return;
    }

    try {
        const response = await fetch("/api/user/houses", {
            headers: { Authorization: `Bearer ${token}` }
        });

        const data = await response.json();
        const houses = data.houses || [];
        if (houses.length === 0) {
            alert("No houses found.");
            return;
        }

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

    try {
        const token = localStorage.getItem("token");
        const res = await fetch(`/api/houses/${houseId}/rooms`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        const data = await res.json();
        const rooms = data.rooms || [];

        // “全部设备”按钮
        const allBtn = document.createElement("div");
        allBtn.className = "nav-box";
        allBtn.innerHTML = `<a href="#">All Devices</a>`;
        allBtn.onclick = () => loadAndRenderDevices(houseId);
        navBar.appendChild(allBtn);

        // 房间按钮
        rooms.forEach(room => {
            const roomBox = document.createElement("div");
            roomBox.className = "nav-box";
            roomBox.innerHTML = `<a href="#">${room.room_name}</a>`;
            roomBox.onclick = () => {
                console.log(`[INFO] Clicked room ${room.room_name} (${room._id})`);
                loadAndRenderDevices(houseId, room._id);
            };
            navBar.appendChild(roomBox);
        });
    } catch (error) {
        console.error("Failed to load room navigation:", error);
    }
}

// ✅ 分类判断与生成 HTML 控件
function getCategoryFromName(deviceName) {
    const categoryMap = {
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

    const lowerName = deviceName.toLowerCase();
    for (let keyword in categoryMap) {
        if (lowerName.includes(keyword)) {
            return categoryMap[keyword];
        }
    }
    return "default";
}

function formatDeviceFileName(deviceName) {
    return deviceName.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim().replace(/\s+/g, '-') + '.svg';
}

function generateSettingsOptions(category, deviceId, isOn) {
    const controlMap = {
        "air-treatment": ["power", "temperature", "fan"],
        "cleaning-appliances": ["power"],
        "household-security": ["power"],
        "power-switch": ["power"],
        "kitchen-electronics": ["power", "temperature"],
        "lighting": ["power", "brightness"]
    };

    const controls = controlMap[category] || ["power"];
    let html = "";

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
    if (controls.includes("temperature")) {
        html += `
        <div class="settings-option">
            <span>Temp</span>
            <div class="temperature-control">
                <button class="temp-btn" onclick="adjustTemperature(-1); event.stopPropagation()">-</button>
                <span class="temp-value">20</span>°C
                <button class="temp-btn" onclick="adjustTemperature(1); event.stopPropagation()">+</button>
            </div>
        </div>`;
    }
    if (controls.includes("fan")) {
        html += `
        <div class="settings-option">
            <span>Fan Speed</span>
            <div class="fan-speed-control">
                <button class="speed-btn" onclick="adjustFanSpeed(-1); event.stopPropagation()">-</button>
                <span class="speed-value">1</span>
                <button class="speed-btn" onclick="adjustFanSpeed(1); event.stopPropagation()">+</button>
            </div>
        </div>`;
    }
    if (controls.includes("brightness")) {
        html += `
        <div class="settings-option">
            <span>Brightness</span>
            <input type="range" class="brightness-slider" min="0" max="100" value="50" onchange="adjustBrightness(this.value)">
        </div>`;
    }
    return html;
}

// ✅ 主渲染函数
async function loadAndRenderDevices(houseId, roomId = null) {
    const token = localStorage.getItem("token");
    let url;
    if (roomId) {
        url = `/api/houses/${houseId}/rooms/${roomId}/devices`;
    } else {
        url = `/api/houses/${houseId}/devices`;
    }

    console.log(`[DEBUG] Fetching devices from: ${url}`);

    try {
        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        const devices = data.devices || [];

        const container = document.getElementById("furnitureContainer");
        container.innerHTML = "";

        if (!devices.length) {
            container.innerHTML = "<p style='color: gray;'>No devices in this room.</p>";
            return;
        }

        devices.forEach(device => {
            const category = getCategoryFromName(device.device_name);
            const fileName = formatDeviceFileName(device.device_name);
            const isOn = device.status === true || device.status === "true";

            const deviceItem = document.createElement("div");
            deviceItem.className = "furniture-item";

            const left = document.createElement("div");
            left.className = "furniture-icon";
            left.innerHTML = `
                <img class="icon-image" src="/icons/${category}/${fileName}" alt="${device.device_name}">
            `;

            const right = document.createElement("div");
            right.className = "furniture-content";
            right.innerHTML = `
                <div class="furniture-name">${device.device_name}</div>
                <div class="setting-container">
                    <img src="../icons/device-page/setting-3.svg" class="setting-icon" alt="settings">
                    <div class="dropdown-menu">${generateSettingsOptions(category, device._id, isOn)}</div>
                </div>
                <div class="delete-container" onclick="removeDevice('${device._id}')">
                    <div class="delete-button">
                        <img src="/icons/delete-left-svgrepo-com.svg" width="20" height="20">
                        <span class="delete-text">Remove</span>
                    </div>
                </div>
            `;

            deviceItem.appendChild(left);
            deviceItem.appendChild(right);
            container.appendChild(deviceItem);
        });
    } catch (error) {
        console.error("Error loading devices:", error);
    }
}

// ✅ 全局绑定：点击展开/关闭 dropdown
window.addEventListener("click", (e) => {
    if (e.target.classList.contains("setting-icon")) {
        const container = e.target.closest(".setting-container");
        const dropdown = container.querySelector(".dropdown-menu");

        // 关闭其他打开的菜单
        document.querySelectorAll(".dropdown-menu").forEach(menu => {
            if (menu !== dropdown) menu.style.display = "none";
        });

        // 切换当前的菜单显示状态
        dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
    } else if (!e.target.closest(".dropdown-menu")) {
        // 如果点击其他地方则关闭所有菜单
        document.querySelectorAll(".dropdown-menu").forEach(menu => {
            menu.style.display = "none";
        });
    }
});

// ✅ 控制函数：温度、风速、亮度
async function adjustTemperature(change) {
    const option = event.target.closest(".settings-option");
    const tempValue = option.querySelector(".temp-value");
    const deviceId = option.closest(".furniture-content").querySelector(".toggle-status").dataset.id;
    let current = parseInt(tempValue.textContent);
    current = Math.min(30, Math.max(10, current + change));
    tempValue.textContent = current;

    try {
        const token = localStorage.getItem("token");
        const res = await fetch(`/api/houses/${currentHouseId}/devices/${deviceId}/temperature`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ temperature: current })
        });
        const result = await res.json();
        if (!result.success) {
            alert("Failed to update temperature.");
        }
    } catch (err) {
        console.error("Error updating temperature:", err);
    }
}





async function adjustFanSpeed(change) {
    const option = event.target.closest(".settings-option");
    const speedValue = option.querySelector(".speed-value");
    const deviceId = option.closest(".furniture-content").querySelector(".toggle-status").dataset.id;
    let current = parseInt(speedValue.textContent);
    current = Math.min(8, Math.max(1, current + change));
    speedValue.textContent = current;

    try {
        const token = localStorage.getItem("token");
        const res = await fetch(`/api/houses/${currentHouseId}/devices/${deviceId}/fan-speed`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ fanSpeed: current })
        });
        const result = await res.json();
        if (!result.success) {
            alert("Failed to update fan speed.");
        }
    } catch (err) {
        console.error("Error updating fan speed:", err);
    }
}

async function adjustBrightness(value) {
    const deviceId = event.target.closest(".furniture-content").querySelector(".toggle-status").dataset.id;

    try {
        const token = localStorage.getItem("token");
        const res = await fetch(`/api/houses/${currentHouseId}/devices/${deviceId}/brightness`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ brightness: parseInt(value) })
        });
        const result = await res.json();
        if (!result.success) {
            alert("Failed to adjust brightness.");
        }
    } catch (err) {
        console.error("Error adjusting brightness:", err);
    }
}


// ✅ 初始化页面
window.addEventListener("DOMContentLoaded", () => {
    initCurrentHouse();
});

// ✅ 删除设备
async function removeDevice(deviceId) {
    if (!confirm("Are you sure you want to delete this device?")) return;
    const token = localStorage.getItem("token");
    const response = await fetch(`/api/device/${deviceId}`, {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        }
    });
    const result = await response.json();
    if (result.success) {
        window.location.reload();
    } else {
        alert("Failed to delete device: " + result.message);
    }
}
window.removeDevice = removeDevice;