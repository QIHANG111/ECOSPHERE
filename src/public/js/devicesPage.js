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

    // Appear modal and update under green background word
    function showModal(text) {
    // Update the word under green background
    document.getElementById("dynamic-text").textContent = text;

    // Appear modal
    var modal = document.getElementById("myModal");
    modal.style.display = "block";
}

    // Close modal
    function closeModal() {
    var modal = document.getElementById("myModal");
    modal.style.display = "none";
}

    // Click outside modal for close
    window.onclick = function (event) {
    var modal = document.getElementById("myModal");
    if (event.target == modal) {
    modal.style.display = "none";
}
}

    // each furniture box index
    const furnitureData = [
    {id: "Lamp1", name: "Beside Lamp", icon: "../icons/device-page/light-svgrepo-com.svg", boxIndex: 0},
    {
        id: "Door-Lock1",
        name: "Smart Door Lock",
        icon: "../icons/device-page/door-lock-svgrepo-com.svg",
        boxIndex: 1
    },
    {
        id: "Air conditioner1",
        name: "Air Conditioner",
        icon: "../icons/device-page/air-conditioner.svg",
        boxIndex: 2
    },
    {id: "Socket1", name: "Socket", icon: "../icons/device-page/socket-i-svgrepo-com.svg", boxIndex: 3}
    ];

    // get furniture container
    const furnitureContainer = document.getElementById("furnitureContainer");

    // create the empty furniture box
    const totalBoxes = 0; // change the total furniture box count
    for (let i = 0; i < totalBoxes; i++) {
    const box = document.createElement("div");
    box.classList.add("furniture-box");
    box.dataset.index = i; // set fb index
    furnitureContainer.appendChild(box);
}

    // render furniture
    function renderFurniture() {
    furnitureData.forEach(furniture => {
        // get the exactly one
        const targetBox = document.querySelector(`.furniture-box[data-index="${furniture.boxIndex}"]`);

        if (targetBox) {
            // create the elements in furniture box
            const furnitureItem = document.createElement("div");
            furnitureItem.classList.add("furniture-item");
            furnitureItem.innerHTML = `
                <div class="furniture-icon">
                    <img src="${furniture.icon}" alt="${furniture.name}" class="icon-image">
                </div>
                <div class="furniture-content">
                 <div class="furniture-name">${furniture.name}</div>
                 <div class="setting-container">
                     <img src="../icons/device-page/setting-3.svg" alt="setting-button" class="setting-icon">
                     <div class="dropdown-menu">
                         <div class="settings-option">Option 1</div>e
                         <div class="settings-option">Option 2</div>
                         <div class="settings-option">Option 3</div>
    </div>
</div>

                    <div class="delete-container" onclick="deleteAndRedirect('${furniture.id}')">
                <div class="delete-button">
                <div class="delete-icon">
                     <img src="../icons/device-page/minus-circle.svg" alt="delete-button">
                 </div>
                 <span class="delete-text">Delete</span>
                 </div>
</div>

                </div>

            `;

            // add element into box
            targetBox.appendChild(furnitureItem);
        }
    });
}

    // for switch
    // <div className="switch-container">
    //<input type="checkbox" className="mui-switch" data-device-name="${furniture.id}"/>
    //</div>

    document.addEventListener("DOMContentLoaded", function () {
    const deviceContainer = document.getElementById("furnitureContainer");

    // **获取分类目录**
    function getCategoryFromName(deviceName) {
    let lowerName = deviceName.toLowerCase();

    for (let keyword in categoryMap) {
    if (lowerName.includes(keyword)) {
    console.log(`✅ Matched "${deviceName}" -> "${categoryMap[keyword]}"`);
    return categoryMap[keyword];
}
}
    console.log(`❌ No match for "${deviceName}", using default`);
    return "default"; // 没找到匹配的类别，使用默认分类
}

    // **检查图片文件名**
    async function getActualFileName(category, formattedName) {
    let possibleNames = [
    formattedName,  // 原始生成的文件名
    formattedName.replace(/-svgrepo-com/, ""), // 移除 `-svgrepo-com`
    formattedName.replace(/-\d+/, ""), // 移除 `-2`, `-3` 这类编号
    formattedName.replace(/ /g, "-") // 处理空格
    ];

    console.log(`🔍 Checking possible file names for ${formattedName}:`, possibleNames);

    for (let name of possibleNames) {
    let testPath = `/icons/${category}/${name}`;
    console.log("🖼 Trying:", testPath);
    if (await imageExists(testPath)) {
    console.log(`✅ Found match: ${name}`);
    return name; // 找到匹配的文件名
}
}

    console.log(`❌ No match found, using default-icon.svg`);
    return "default-icon.svg"; // **如果找不到文件，明确返回 default-icon.svg**
}

    // **检查图片是否存在**
    async function imageExists(imagePath) {
    try {
    const response = await fetch(imagePath, {method: "HEAD"});
    return response.ok; // 如果服务器返回 `200 OK`，说明图片存在
} catch (error) {
    console.error(`❌ Error checking image: ${imagePath}`, error);
    return false; // 出错则认为文件不存在
}
}

    // **渲染设备**
    async function renderDevice(device) {
    let deviceElement = document.createElement("div");
    deviceElement.classList.add("device-card");

    let categoryFolder = getCategoryFromName(device.device_name);
    let formattedName = device.device_name.toLowerCase().replace(/\s+/g, '-') + ".svg";

    // ✅ 确保 `getActualFileName()` 先执行
    let actualFileName = await getActualFileName(categoryFolder, formattedName);
    let imageUrl = `/icons/${categoryFolder}/${actualFileName}`;

    console.log(`🖼 Final Image URL: ${imageUrl}`);

    // 设备状态转换
    const isOn = device.status === "true" || device.status === true;

    // 生成 HTML
    deviceElement.innerHTML = `
            <div class="device-left">
                <img class="device-icon" src="${imageUrl}" alt="${device.device_name}"
                    onerror="this.onerror=null;this.src='/icons/default-icon.svg'; console.log('⚠️ Image not found, using default:', this.src);">
                <h3 class="device-name">${device.device_name}</h3>
            </div>
            <div class="device-right">
            <div class="setting-container">
    <img src="../icons/device-page/setting-3.svg" alt="setting-button" class="setting-icon" onclick="toggleDropdown(this)">
    <div class="dropdown-menu">
        <!-- 滑动开关按钮 -->
        <div class="settings-option">
            <span>Power</span>
            <label class="switch">
                <input type="checkbox" class="toggle-status" data-id="${device._id}" ${isOn ? "checked" : ""} onclick="event.stopPropagation()">
                <span class="slider round"></span>
            </label>
        </div>

        <!-- 温度上下调节按钮 -->
        <div class="settings-option">
            <span>Temp</span>
            <div class="temperature-control">
                <button class="temp-btn" onclick="adjustTemperature(-1); event.stopPropagation()">-</button>
                <span class="temp-value">20</span>&deg;C
                <button class="temp-btn" onclick="adjustTemperature(1); event.stopPropagation()">+</button>
            </div>
        </div>

        <!-- 调节风速按钮 -->
        <div class="settings-option">
            <span>Fan Speed</span>
            <div class="fan-speed-control">
                <button class="speed-btn" onclick="adjustFanSpeed(-1); event.stopPropagation()">-</button>
                <span class="speed-value">1</span>
                <button class="speed-btn" onclick="adjustFanSpeed(1); event.stopPropagation()">+</button>
            </div>
        </div>
    </div>
</div>

    <div class="delete-container" onclick="removeDevice('${device._id}')">
    <div class="delete-button">
        <div class="delete-icon">
            <img src="../icons/delete-1-svgrepo-com.svg" alt="remove-icon">
        </div>
        <span class="delete-text">Remove</span>
    </div>
</div>

        </div>
    `;

    deviceContainer.appendChild(deviceElement);
}

    // 绑定事件
    async function toggleDeviceStatus(deviceId, newStatus) {
    try {
    const response = await fetch("/api/update-device", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({name: deviceId, status: newStatus})
});

    const result = await response.json();
    if (result.success) {
    console.log("Device status updated successfully.");
    loadDevices();
} else {
    console.error("Failed to update device status:", result.message);
}
} catch (error) {
    console.error("Error updating device status:", error);
}
}

        async function removeDevice(deviceId) {
            console.log(`🗑 Attempting to delete device: ${deviceId}`);

            if (!deviceId) {
                console.error("❌ Device ID is missing!");
                alert("Error: Device ID is missing!");
                return;
            }

            if (!confirm("Are you sure you want to delete this device?")) {
                return;
            }

            const token = localStorage.getItem("token");
            if (!token) {
                alert("You must be logged in to delete a device.");
                return;
            }

            try {
                const response = await fetch(`/api/device/${deviceId}`, {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}` //
                    }
                });

                if (!response.ok) {
                    throw new Error(`❌ HTTP error! Status: ${response.status}`);
                }

                const result = await response.json();
                console.log("📩 Server Response:", result);

                if (result.success) {
                    console.log(`✅ Successfully deleted device: ${deviceId}`);
                    window.location.reload(); // or remove element directly
                } else {
                    console.error("❌ Failed to delete device:", result.message);
                    alert(`Error: ${result.message}`);
                }
            } catch (error) {
                console.error("❌ Error deleting device:", error);
                alert("You don't have permission to delete this device.");
            }
        }

// ✅ 让 `removeDevice` 变成全局函数
    window.removeDevice = removeDevice;




    function getUserRoleFromToken(token) {
    try {
    const base64Url = token.split('.')[1]; // 获取 `JWT` payload 部分
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
}).join(''));

    const decodedToken = JSON.parse(jsonPayload);
    return decodedToken.role || "guest"; // ✅ 如果 `role` 不存在，默认为 `guest`
} catch (error) {
    console.error("❌ Error decoding JWT token:", error);
    return "guest";
}
}


    // 监听 `addelectric.html` 添加的设备
    window.addEventListener("storage", function (event) {
    if (event.key === "newDevice") {
    const newDevice = JSON.parse(event.newValue);
    console.log("Received new device:", newDevice);
    loadDevices();
    localStorage.removeItem("newDevice");
}
});

    loadDevices();
});

    // 下拉菜单
    function toggleDropdown(element) {
    const dropdownMenu = element.nextElementSibling;
    document.querySelectorAll(".dropdown-menu").forEach(menu => {
    if (menu !== dropdownMenu) menu.style.display = "none";
});
    dropdownMenu.style.display = dropdownMenu.style.display === "block" ? "none" : "block";
}

    // 关闭下拉菜单（当点击页面其他地方）
    window.addEventListener("click", function (event) {
    if (!event.target.matches('.setting-icon') && !event.target.closest('.dropdown-menu')) {
    document.querySelectorAll(".dropdown-menu").forEach(menu => menu.style.display = "none");
}
});

    // 温度调节
    function adjustTemperature(change) {
    const tempValue = document.querySelector('.temp-value');
    let currentTemp = parseInt(tempValue.textContent);
    currentTemp += change;
    if (currentTemp < 10) currentTemp = 10; // 最低温度
    if (currentTemp > 30) currentTemp = 30; // 最高温度
    tempValue.textContent = currentTemp;
}

    // 风速调节
    function adjustFanSpeed(change) {
    const speedValue = document.querySelector('.speed-value');
    let currentSpeed = parseInt(speedValue.textContent);
    currentSpeed += change;
    if (currentSpeed < 1) currentSpeed = 1; // 最低风速
    if (currentSpeed > 5) currentSpeed = 5; // 最高风速
    speedValue.textContent = currentSpeed;
}






//don't change this

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
    } catch (error) {
        console.error("Failed to load room navigation:", error);
    }
}function formatDeviceFileName(deviceName) {
    return deviceName
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, '')
        .trim()
        .replace(/\s+/g, '-') + '.svg';
}

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

async function loadAndRenderDevices(houseId, roomId = null) {
    const token = localStorage.getItem("token");
    let url = `/api/houses/${houseId}/devices`;
    if (roomId) url += `?room=${roomId}`;

    try {
        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        const devices = data.devices || [];

        const container = document.getElementById("furnitureContainer");
        container.innerHTML = "";

        devices.forEach(device => {
            const category = getCategoryFromName(device.device_name);
            const fileName = formatDeviceFileName(device.device_name);

            const deviceItem = document.createElement("div");
            deviceItem.className = "furniture-item";

            const left = document.createElement("div");
            left.className = "furniture-icon";
            left.innerHTML = `
                <img class="icon-image" src="/icons/${category}/${fileName}" alt="${device.device_name}" onerror="this.src='/icons/default-icon.svg'">
            `;

            const right = document.createElement("div");
            right.className = "furniture-content";
            right.innerHTML = `
                <div class="furniture-name">${device.device_name}</div>
                <div class="room-name">${device.room?.room_name || "Unassigned"}</div>
                <div class="setting-container">
                    <img src="../icons/device-page/setting-3.svg" alt="setting-button" class="setting-icon" onclick="toggleDropdown(this)">
                    <div class="dropdown-menu">
                        <div class="settings-option">
                            <span>Power</span>
                            <label class="switch">
                                <input type="checkbox" class="toggle-status" data-id="${device._id}" ${device.status === "true" ? "checked" : ""}>
                                <span class="slider"></span>
                            </label>
                        </div>
                        <div class="settings-option">
                            <span>Temp</span>
                            <div class="temperature-control">
                                <button class="temp-btn" onclick="adjustTemperature(-1); event.stopPropagation()">-</button>
                                <span class="temp-value">20</span>°C
                                <button class="temp-btn" onclick="adjustTemperature(1); event.stopPropagation()">+</button>
                            </div>
                        </div>
                        <div class="settings-option">
                            <span>Fan Speed</span>
                            <div class="fan-speed-control">
                                <button class="speed-btn" onclick="adjustFanSpeed(-1); event.stopPropagation()">-</button>
                                <span class="speed-value">1</span>
                                <button class="speed-btn" onclick="adjustFanSpeed(1); event.stopPropagation()">+</button>
                            </div>
                        </div>
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
document.addEventListener("DOMContentLoaded", () => {
    initCurrentHouse();
});

