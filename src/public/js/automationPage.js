
const token = localStorage.getItem("token");
let currentHouseId = null;

async function initHouseSelector() {
    if (!token) return;

    try {
        const res = await fetch("/api/user/houses", {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        const houses = data.houses;
        const selector = document.getElementById("houseSelector");
        selector.innerHTML = "";

        houses.forEach(h => {
            const option = document.createElement("option");
            option.value = h._id;
            option.textContent = h.house_name;
            selector.appendChild(option);
        });

        currentHouseId = houses[0]._id;
        selector.value = currentHouseId;
        localStorage.setItem("currentHouseId", currentHouseId);

        selector.addEventListener("change", () => {
            currentHouseId = selector.value;
            localStorage.setItem("currentHouseId", currentHouseId);
            fetchAutomationsFromDB();
        });

        fetchAutomationsFromDB();
    } catch (err) {
        console.error("Failed to fetch house list:", err);
    }
}

let standbyDevices = [
    { id: "cleaning", name: "Cleaning" },
    { id: "kitchen", name: "Kitchen" },
    { id: "security", name: "Security" },
    { id: "AC", name: "AC" },
    { id: "humidifier", name: "Humidifier" },
    { id: "light", name: "Light" },
    { id: "fan", name: "Fan" }
];

let addedDevices = JSON.parse(localStorage.getItem("devices")) || [];

document.addEventListener("DOMContentLoaded", () => {
    initHouseSelector();
    renderDevices();
    populateStandbyList();
});

document.getElementById("addFunctionButton").addEventListener("click", () => {
    document.getElementById("standbyModal").style.display = "block";
});

document.getElementById("closeModalAutomationPage").addEventListener("click", () => {
    document.getElementById("standbyModal").style.display = "none";
});

function populateStandbyList() {
    const container = document.getElementById("standbyList");
    container.innerHTML = standbyDevices.map(device => `
        <div class="standbyItem">
            <span>${device.name}</span>
            <button class="addFunctionButtonAP" onclick="addDevice('${device.id}', '${device.name}')">Add</button>
        </div>
    `).join("");
}

async function addDevice(id, name) {
    if (addedDevices.some((d) => d.id === id)) return;

    try {
        const res = await fetch("/api/automations", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                device_type: id,
                house: currentHouseId
            })
        });

        const data = await res.json();

        if (res.ok && data.success) {
            const automation = data.automation;
            addedDevices.push({
                id: automation._id,
                name: automation.device_type
            });
            localStorage.setItem("devices", JSON.stringify(addedDevices));
            renderDevices();
        } else {
            console.warn("Failed to create automation:", data.message);
            alert(data.message || "Failed to add automation.");
        }
    } catch (err) {
        console.error("Error adding automation:", err);
        alert("Server error while creating automation.");
    }
}

async function removeFunction(id) {
    const confirmed = confirm("Are you sure you want to delete this automation?");
    if (!confirmed) return;

    try {
        const res = await fetch(`/api/automations/${id}`, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const data = await res.json();
        if (res.ok && data.success) {
            addedDevices = addedDevices.filter(d => d.id !== id);
            localStorage.setItem("devices", JSON.stringify(addedDevices));
            renderDevices();
        } else {
            alert(`Failed to delete automation: ${data.message || "Unknown error"}`);
        }
    } catch (err) {
        console.error("Error deleting automation:", err);
        alert("Server error occurred while deleting automation.");
    }
}


function formatDateTime(isoString) {
    const date = new Date(isoString);
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
}


function checkIfActive(startISO, endISO) {
    if (!startISO || !endISO) return false;

    const now = new Date();
    const start = new Date(startISO);
    const end = new Date(endISO);

    return now >= start && now <= end;
}


function renderDevices() {
    const container = document.getElementById("functionContainer");
    container.innerHTML = addedDevices.map(device => {
        const start = device.startTime ? formatDateTime(device.startTime) : "No start time";
        const end = device.endTime ? formatDateTime(device.endTime) : "No end time";

        const isActive = checkIfActive(device.startTime, device.endTime);
        const statusClass = isActive ? "on" : "off";
        const statusText = isActive ? "Working" : "Idle";

        return `
            <div class="normalCardAP" id="device-${device.id}">
                <div class="device-card">
                    <div class="function-header">
                        <button onclick='removeFunction("${device.id}")' class="removeFunctionButton">
                            <img src="/icons/remove.svg" width="100%" height="100%">
                        </button>
                        <h4>${device.name}</h4>
                    </div>
                    <button class="scheduleButton" onclick="openScheduleModal(this)">Schedule</button>
                    <div class="scheduleBar">Start: ${start}<br>End: ${end}</div>
                    <div class="statusIndicator ${statusClass}">${statusText}</div>
                    <button class="stopScheduleButton" onclick="stopSchedule(this)">Stop Device</button>
                </div>
            </div>
        `;
    }).join("");
}

function toggleDeviceStatus(device, isActive) {
    const statusIndicator = device.querySelector(".statusIndicator");
    if (isActive) {
        statusIndicator.textContent = "Working";
        statusIndicator.classList.remove("off");
        statusIndicator.classList.add("on");
    } else {
        statusIndicator.textContent = "Idle";
        statusIndicator.classList.remove("on");
        statusIndicator.classList.add("off");
    }
}

function stopSchedule(button) {
    const device = button.closest(".normalCardAP");
    if (!device) return;

    toggleDeviceStatus(device, false);
    const scheduleBar = device.querySelector(".scheduleBar");
    scheduleBar.innerHTML = "No schedule set";

    const automationId = device.id.replace("device-", "");
    const now = new Date();
    const isoNow = now.toISOString();

    fetch(`/api/automations/${automationId}/toggle`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            houseId: currentHouseId,
            status: false,
            startTime: isoNow,
            endTime: isoNow
        })
    });
}

function openScheduleModal(button) {
    const device = button.closest(".normalCardAP");
    const automationId = device.id.replace("device-", "");

    const startTime = prompt("Enter start time (HH:MM):");
    const endTime = prompt("Enter end time (HH:MM):");

    if (startTime && endTime) {
        const formattedStart = formatTime(startTime);
        const formattedEnd = formatTime(endTime);
        const scheduleBar = device.querySelector(".scheduleBar");
        scheduleBar.innerHTML = `Start time: ${formattedStart}<br>End time: ${formattedEnd}`;

        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();
        const startMinutes = parseTimeToMinutes(startTime);
        const endMinutes = parseTimeToMinutes(endTime);

        const isActive = currentTime >= startMinutes && currentTime <= endMinutes;
        toggleDeviceStatus(device, isActive);

        const [sh, sm] = startTime.split(":").map(Number);
        const [eh, em] = endTime.split(":").map(Number);
        const startISO = new Date(now.getFullYear(), now.getMonth(), now.getDate(), sh, sm).toISOString();
        const endISO = new Date(now.getFullYear(), now.getMonth(), now.getDate(), eh, em).toISOString();

        fetch(`/api/automations/${automationId}/toggle`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                houseId: currentHouseId,
                status: true, // or false
                startTime: startISO,
                endTime: endISO
            })
        }).then(res => res.json()).then(data => {
            if (!data.success) console.warn("Automation toggle failed:", data.message);
        });
    }
}

function formatTime(time) {
    let [h, m] = time.split(":").map(Number);
    let period = "AM";
    if (h >= 12) {
        period = "PM";
        if (h > 12) h -= 12;
    } else if (h === 0) {
        h = 12;
    }
    return `${h}:${m.toString().padStart(2, "0")} ${period}`;
}

function parseTimeToMinutes(time) {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
}

async function fetchAutomationsFromDB() {
    const houseId = currentHouseId || localStorage.getItem("currentHouseId");
    if (!houseId) return;

    try {
        const res = await fetch(`/api/automations?houseId=${houseId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
            addedDevices = data.automations.map(a => ({
                id: a._id,
                name: a.device_type || "Unnamed Automation",
                startTime: a.startTime,
                endTime: a.endTime
            }));
            localStorage.setItem("devices", JSON.stringify(addedDevices));
            renderDevices();
        }
    } catch (err) {
        console.error("Fetch automations error:", err);
    }
}
