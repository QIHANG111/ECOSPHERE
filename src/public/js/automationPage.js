// a list of standby functions that should be sync from database
// *** //
const standbyDevices = [
    { id: 1, name: "Cleaning"},
    { id: 2, name: "Kitchen"},
    { id: 3, name: "Security"},
    { id: 4, name: "AC"},
    { id: 5, name: "Clock"},
    { id: 6, name: "light"}
];

// get device from local storage, should change to database
// *** //
let addedDevices = JSON.parse(localStorage.getItem('devices')) || [];

// event listener, if someone click on the "add function" button, it will run this two code
document.addEventListener('DOMContentLoaded', () => {
    renderDevices();
    populateStandbyList();
});

// event listener on button of add functions, close (standby function) window
document.getElementById('addFunctionButton').addEventListener('click', openModal);
document.getElementById('closeModalAutomationPage').addEventListener('click', closeModalAutomationPage);

// function that open the (standby function) window
function openModal() {
    document.getElementById('standbyModal').style.display = 'block';
}

// function that close the (standby function) window
function closeModalAutomationPage() {
    document.getElementById('standbyModal').style.display = 'none';
}

// function that show Available function in the (standby function) window
// *** //
function populateStandbyList() {
    // sync the function from the standbyList
    // *** //
    const container = document.getElementById('standbyList');
    container.innerHTML = standbyDevices.map(device => `
        <div class="standbyItem">
            <span>${device.name}</span>
            <button class = "addFunctionButtonAP"onclick="addDevice(${device.id})">Add</button>
        </div>
    `).join('');
}

// function that add device once the user clicks on the button
// *** //
function addDevice(deviceId) {
    const device = standbyDevices.find(d => d.id === deviceId);
    if (!addedDevices.some(d => d.id === deviceId)) {
        addedDevices.push(device);
        localStorage.setItem('devices', JSON.stringify(addedDevices));
        renderDevices();
    }
}

//function that show every interface in the modal
function renderDevices() {
    const container = document.getElementById('functionContainer');
    container.innerHTML = addedDevices.map(device => `
    <div class="normalCardAP" id="device-${device.id}">
        <div class="device-card" id="device-${device.id}">
            <div class="function-header">
                <!--remove button on remove the function-->
                <!--***-->
                <button onclick='removeFunction(${device.id})' class="removeFunctionButton">
                    <img src="/icons/remove.svg" width="100%" height="100%">
                </button>
                <h4>${device.name}</h4>
            </div>
                <!-- Schedule button, process the function -->
                <button class="scheduleButton" onclick="openScheduleModal(this)">Schedule</button>

                <!-- Schedule bar where the time range will appear -->
                <div class="scheduleBar">No schedule set</div>

                <!-- Status indicator for Working / Rest -->
                <div class="statusIndicator off">Idle</div>

                <!-- Stop button (forces device to stop even if in schedule range) -->
                <button class="stopScheduleButton" onclick="stopSchedule(this)">Stop Device</button>
        </div>
    </div>
    `).join('');
}
// Remove function that should remove function in database
// *** //
function removeFunction(deviceId) {
    addedDevices = addedDevices.filter(device => device.id !== deviceId);
    localStorage.setItem('addedDevices', JSON.stringify(addedDevices));
    renderDevices();
}

// stop the function once click on it
// should be stopping the device working in database (doesn't really matter)
// * //
function stopSchedule(button) {
    const device = button.closest(".normalCardAP");
    if (!device) {
        console.error("Device card not found.");
        return;
    }

    // Force device to Idle
    toggleDeviceStatus(device, false);

    // Optionally reset the schedule bar
    const scheduleBar = device.querySelector(".scheduleBar");
    scheduleBar.innerHTML = "No schedule set";
}


// Initial render
renderDevices();

// Open schedule modal, ask users for time
function openScheduleModal(button) {
    const device = button.closest(".normalCardAP");

    if (!device) {
        alert("Error: device card not found.");
        return;
    }

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

        // will call another function (toggleDevicesStatus) it will make the device not working)
        if (currentTime >= startMinutes && currentTime <= endMinutes) {
            toggleDeviceStatus(device, true);
        } else {
            toggleDeviceStatus(device, false);
        }
    }
    else {
        alert("Error: invalid time input.");
    }
}

// Convert HH:MM (24-hour) to 12-hour AM/PM format
function formatTime(time) {
    let [hours, minutes] = time.split(":").map(Number);
    let period = "AM";

    if (hours >= 12) {
        period = "PM";
        if (hours > 12) hours -= 12;
    } else if (hours === 0) {
        hours = 12;
    }

    return `${hours}:${minutes.toString().padStart(2, "0")} ${period}`;
}

// Convert HH:MM to total minutes for comparison
function parseTimeToMinutes(time) {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
}

// Toggle device status
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
