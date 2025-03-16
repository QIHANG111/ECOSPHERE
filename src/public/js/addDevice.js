document.addEventListener("DOMContentLoaded", function () {
    const deviceCategoriesContainer = document.getElementById("deviceCategories");

    // 获取所有设备（从后端 API 获取）
    fetch("/api/devices")
        .then(response => response.json())
        .then(devices => {
            if (devices.length === 0) {
                deviceCategoriesContainer.innerHTML = "<p>No devices available</p>";
                return;
            }

            const categories = {}; // 存储不同类别的设备

            // 遍历设备，按照类别分类
            devices.forEach(device => {
                if (!categories[device.category]) {
                    categories[device.category] = [];
                }
                categories[device.category].push(device);
            });

            // 渲染设备分类
            for (const category in categories) {
                const categorySection = document.createElement("div");
                categorySection.classList.add("category");

                const categoryTitle = document.createElement("h2");
                categoryTitle.textContent = category.replace("-", " ").toUpperCase(); // 处理类别格式
                categoryTitle.classList.add("category-title");
                categorySection.appendChild(categoryTitle);

                const deviceGrid = document.createElement("div");
                deviceGrid.classList.add("device-grid");

                // 渲染该类别下的设备
                categories[category].forEach(device => {
                    const deviceItem = document.createElement("div");
                    deviceItem.classList.add("device-item");
                    deviceItem.innerHTML = `
                        <img src="${device.icon}" alt="${device.name}" class="device-icon">
                        <p>${device.name}</p>
                    `;
                    deviceItem.addEventListener("click", function () {
                        addDeviceToUser(device.id);
                    });

                    deviceGrid.appendChild(deviceItem);
                });

                categorySection.appendChild(deviceGrid);
                deviceCategoriesContainer.appendChild(categorySection);
            }
        })
        .catch(error => {
            console.error("Error loading devices:", error);
            deviceCategoriesContainer.innerHTML = "<p>Error loading devices</p>";
        });
});

// 添加设备到用户设备列表
function addDeviceToUser(deviceId) {
    fetch("/api/device/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deviceId })
    })
        .then(response => response.json())
        .then(data => {
            console.log("Device added:", data);
            window.location.href = "devicePage.html"; // 添加后跳回主页面
        })
        .catch(error => console.error("Error adding device:", error));
}

// 返回 `devicePage.html`
function goBack() {
    window.location.href = "devicePage.html";
}
