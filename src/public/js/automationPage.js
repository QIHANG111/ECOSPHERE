// const standbyDevices = [
//     { id: 1, name: "Light Control", icon: "/icons/light-control.svg" },
//     { id: 2, name: "Thermostat", icon: "/images/thermostat.png" },
//     { id: 3, name: "Security Cam", icon: "/icons/Security-camera.svg" },
//     { id: 4, name: "Schedule", icon: "/images/schedule.png" },
//     { id: 5, name: "Clock", icon: "/icons/clock.svg", script: "/js/clock.js" }
// ];
//
// let addedDevices = JSON.parse(localStorage.getItem('devices')) || [];
//
// document.addEventListener('DOMContentLoaded', () => {
//     renderDevices();
//     populateStandbyList();
// });
//
// document.getElementById('addFunctionButton').addEventListener('click', openModal);
document.getElementById('closeModalAutomationPage').addEventListener('click', closeModalAutomationPage);
//
// function openModal() {
//     document.getElementById('standbyModal').style.display = 'block';
// }
//
// function closeModalAutomationPage() {
//     document.getElementById('standbyModal').style.display = 'none';
// }
//
// function populateStandbyList() {
//     const container = document.getElementById('standbyList');
//     container.innerHTML = standbyDevices.map(device => `
//         <div class="standbyItem">
//             <span>${device.name}</span>
//             <button class = "addFunctionButtonAP"onclick="addDevice(${device.id})">Add</button>
//         </div>
//     `).join('');
// }
//
// // add button function inside the prepared list
// function addDevice(deviceId) {
//     const device = standbyDevices.find(d => d.id === deviceId);
//     if (!addedDevices.some(d => d.id === deviceId)) {
//         addedDevices.push(device);
//         localStorage.setItem('devices', JSON.stringify(addedDevices));
//         renderDevices();
//     }
// }
//
// function renderDevices() {
//     const container = document.getElementById('functionContainer');
//     container.innerHTML = addedDevices.map(device => `
//     <div class="normalCardAP" id="device-${device.id}">
//         <div class="device-card" id="device-${device.id}">
//             <div class="function-header">
//                 <button onclick='removeFunction(${device.id})' class="removeFunctionButton">
//                     <img src="/icons/remove.svg" width="100%" height="100%">
//                 </button>
//                 <h4>${device.name}</h4>
//             </div>
//                 <!-- Schedule button -->
//                 <button class="scheduleButton" onclick="openScheduleModal(this)">Schedule</button>
//
//                 <!-- Schedule bar where the time range will appear -->
//                 <div class="scheduleBar">No schedule set</div>
//
//                 <!-- Status indicator for Working / Rest -->
//                 <div class="statusIndicator off">Idle</div>
//
//                 <!-- Stop button (forces device to stop even if in schedule range) -->
//                 <button class="stopScheduleButton" onclick="stopSchedule(this)">Stop Device</button>
//         </div>
//     </div>
//     `).join('');
// }
// // Remove function
// function removeFunction(deviceId) {
//     addedDevices = addedDevices.filter(device => device.id !== deviceId);
//     localStorage.setItem('addedDevices', JSON.stringify(addedDevices));
//     renderDevices();
// }
//
// function stopSchedule(button) {
//     const device = button.closest(".normalCardAP");
//     if (!device) {
//         console.error("Device card not found.");
//         return;
//     }
//
//     // Force device to Idle
//     toggleDeviceStatus(device, false);
//
//     // Optionally reset the schedule bar
//     const scheduleBar = device.querySelector(".scheduleBar");
//     scheduleBar.innerHTML = "No schedule set";
// }
//
//
// // Initial render
// renderDevices();
//
// // Open schedule modal
// function openScheduleModal(button) {
//     const device = button.closest(".normalCardAP");
//
//     if (!device) {
//         alert("Error: device card not found.");
//         return;
//     }
//
//     const startTime = prompt("Enter start time (HH:MM):");
//     const endTime = prompt("Enter end time (HH:MM):");
//
//     if (startTime && endTime) {
//         const formattedStart = formatTime(startTime);
//         const formattedEnd = formatTime(endTime);
//
//         const scheduleBar = device.querySelector(".scheduleBar");
//         scheduleBar.innerHTML = `Start time: ${formattedStart}<br>End time: ${formattedEnd}`;
//
//         const now = new Date();
//         const currentTime = now.getHours() * 60 + now.getMinutes();
//         const startMinutes = parseTimeToMinutes(startTime);
//         const endMinutes = parseTimeToMinutes(endTime);
//
//         if (currentTime >= startMinutes && currentTime <= endMinutes) {
//             toggleDeviceStatus(device, true);
//         } else {
//             toggleDeviceStatus(device, false);
//         }
//     }
//     else {
//         alert("Error: invalid time input.");
//     }
// }
//
// // Convert HH:MM (24-hour) to 12-hour AM/PM format
// function formatTime(time) {
//     let [hours, minutes] = time.split(":").map(Number);
//     let period = "AM";
//
//     if (hours >= 12) {
//         period = "PM";
//         if (hours > 12) hours -= 12;
//     } else if (hours === 0) {
//         hours = 12;
//     }
//
//     return `${hours}:${minutes.toString().padStart(2, "0")} ${period}`;
// }
//
// // Convert HH:MM to total minutes for comparison
// function parseTimeToMinutes(time) {
//     const [hours, minutes] = time.split(":").map(Number);
//     return hours * 60 + minutes;
// }
//
// // Toggle device status
// function toggleDeviceStatus(device, isActive) {
//     const statusIndicator = device.querySelector(".statusIndicator");
//     if (isActive) {
//         statusIndicator.textContent = "Working";
//         statusIndicator.classList.remove("off");
//         statusIndicator.classList.add("on");
//     } else {
//         statusIndicator.textContent = "Idle";
//         statusIndicator.classList.remove("on");
//         statusIndicator.classList.add("off");
//     }
// }
/******************************************************
 * 1. Basic Config: House + Token
 *    (Adjust how you get houseId/token as needed)
 ******************************************************/
const houseId = localStorage.getItem('houseId'); // e.g. "64abc...someObjectId"
const token   = localStorage.getItem('token');   // JWT from sign-in

// We won't store devices in localStorage. We'll fetch them from the backend.
let automations = []; // This replaces your local 'addedDevices'

/******************************************************
 * 2. On Page Load
 ******************************************************/
document.addEventListener('DOMContentLoaded', () => {
    loadAutomations();    // Load from your backend
    populateStandbyList(); // If you still want to show a static list in the modal
});

// The 'Add Device' button opens the modal
document.getElementById('addFunctionButton')
    .addEventListener('click', openModal);

// The close button in the modal
document.getElementById('closeModalAutomationPage')
    .addEventListener('click', closeModalAutomationPage);

/******************************************************
 * 3. Modal Open/Close
 ******************************************************/
function openModal() {
    document.getElementById('standbyModal').style.display = 'block';
}

function closeModalAutomationPage() {
    document.getElementById('standbyModal').style.display = 'none';
}

/******************************************************
 * 4. Populate the Standby List (Static or Another API)
 ******************************************************/
function populateStandbyList() {
    // If you have a real endpoint for "available devices," call it here.
    // For now, we use a static array:
    const standbyDevices = [
        { id: 1, name: "Light Control", icon: "/icons/light-control.svg" },
        { id: 2, name: "Thermostat", icon: "/images/thermostat.png" },
        { id: 3, name: "Security Cam", icon: "/icons/Security-camera.svg" },
        { id: 4, name: "Schedule", icon: "/images/schedule.png" },
        { id: 5, name: "Clock", icon: "/icons/clock.svg" }
    ];

    const container = document.getElementById('standbyList');
    container.innerHTML = standbyDevices.map(device => `
    <div class="standbyItem">
      <span>${device.name}</span>
      <!-- If you had an endpoint for creating a new automation rule, you’d call it here. -->
      <button class="addFunctionButtonAP" onclick="addDevice(${device.id})">
        Add
      </button>
    </div>
  `).join('');
}

/******************************************************
 * 5. Load Existing Automations from Backend
 *    Replaces your localStorage 'addedDevices'
 ******************************************************/
async function loadAutomations() {
    if (!houseId) {
        console.error("No houseId found. Cannot load automations.");
        return;
    }
    try {
        const response = await fetch(`/api/automations?houseId=${houseId}`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) {
            throw new Error("Failed to fetch automations");
        }
        const data = await response.json();
        if (!data.success) {
            console.error("Backend error:", data.message);
            return;
        }
        automations = data.automations; // Store them in a global array
        renderDevices();                // Render them in the UI
    } catch (error) {
        console.error("Error loading automations:", error);
    }
}

/******************************************************
 * 6. (Optional) Add a Device / Create an Automation
 *    If you want to create a brand-new automation rule,
 *    you'd need a POST /api/automations endpoint. Right now,
 *    your appRoute.js only has GET & PUT for automations.
 ******************************************************/
async function addDevice(deviceId) {
    // You currently have no POST /api/automations route in appRoute.js.
    // So we can't truly "create" a new automation. This is a placeholder.
    alert("No backend endpoint for adding new automation. Implementation needed!");
    // Example if you had one:
    // const response = await fetch('/api/automations', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    //   body: JSON.stringify({ houseId, deviceId, ... })
    // });
    // if (response.ok) { loadAutomations(); }
}

/******************************************************
 * 7. Render Automations (Your "addedDevices" Cards)
 ******************************************************/
function renderDevices() {
    const container = document.getElementById('functionContainer');
    if (!automations || automations.length === 0) {
        container.innerHTML = "<p>No automation rules found.</p>";
        return;
    }

    container.innerHTML = automations.map(automation => {
        const isActive = automation.status === true;
        const startTime = automation.startTime
            ? new Date(automation.startTime).toLocaleTimeString()
            : "No schedule set";
        const endTime = automation.endTime
            ? new Date(automation.endTime).toLocaleTimeString()
            : "No schedule set";

        return `
      <div class="normalCardAP" id="automation-${automation._id}">
        <div class="device-card">
          <div class="function-header">
            <!-- You had a removeFunction(...) call, but there's no remove in your backend. -->
            <!-- <button onclick="removeFunction(${automation._id})" class="removeFunctionButton">
                <img src="/icons/remove.svg" width="100%" height="100%">
            </button> -->
            <h4>${automation.ruleName || "Automation"}</h4>
          </div>
          <!-- Schedule button -->
          <button class="scheduleButton" onclick="openScheduleModal('${automation._id}')">
            Schedule
          </button>
          <!-- Schedule bar -->
          <div class="scheduleBar">
            Start: ${startTime}<br>
            End: ${endTime}
          </div>
          <!-- Status indicator -->
          <div class="statusIndicator ${isActive ? 'on' : 'off'}">
            ${isActive ? 'Working' : 'Idle'}
          </div>
          <!-- Stop button -->
          <button class="stopScheduleButton" onclick="stopSchedule('${automation._id}')">
            Stop Device
          </button>
        </div>
      </div>
    `;
    }).join('');
}

/******************************************************
 * 8. Stop an Automation (Set status = false)
 ******************************************************/
function stopSchedule(automationId) {
    toggleAutomation(automationId, false);
}

/******************************************************
 * 9. Open Schedule Modal (Prompt-based)
 *    Then call toggleAutomation(...) with status=true
 ******************************************************/
function openScheduleModal(automationId) {
    const startTime = prompt("Enter start time (HH:MM):");
    const endTime   = prompt("Enter end time (HH:MM):");

    if (startTime && endTime) {
        // Convert them to something your backend can parse
        toggleAutomation(automationId, true, startTime, endTime);
    } else {
        alert("Invalid time input.");
    }
}

/******************************************************
 * 10. PUT /api/automations/:id/toggle
 *     to schedule or stop the automation
 ******************************************************/
async function toggleAutomation(automationId, status, startTime, endTime) {
    if (!houseId) {
        console.error("No houseId. Cannot toggle automation.");
        return;
    }
    try {
        const body = { status, houseId };
        if (status === true) {
            body.startTime = startTime;
            body.endTime   = endTime;
        }

        const response = await fetch(`/api/automations/${automationId}/toggle`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.message || 'Failed to toggle automation');
        }

        const result = await response.json();
        console.log("Automation updated:", result);

        // Refresh the list from the server
        loadAutomations();
    } catch (error) {
        console.error("Error toggling automation:", error);
    }
}

/******************************************************
 * 11. (Optional) Remove Functions
 *     If you had an endpoint for removing an automation,
 *     you'd define removeFunction(...) to call that endpoint.
 ******************************************************/

/******************************************************
 * 12. Utility: Format or Parse Times
 *     (If you need them, similar to your old code)
 ******************************************************/
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
