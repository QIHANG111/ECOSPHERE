
// Sample standby functions data
const standbyFunctions = [
    { id: 1, name: "Light Control", icon: "/icons/light-control.svg" },
    { id: 2, name: "Thermostat", icon: "/images/thermostat.png" },
    { id: 3, name: "Security Cam", icon: "/icons/Security-camera.svg" },
    { id: 4, name: "Schedule", icon: "/images/schedule.png" },
    { id: 5, name: "Clock", icon: "/icons/clock.svg", script: "/js/clock.js" }
];

// Load existing configuration
let addedFunctions = JSON.parse(localStorage.getItem('addedFunctions')) || [];

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    renderAddedFunctions();
    populateStandbyList();
});

// Open/Close Modal
document.getElementById('addFunctionBtn').addEventListener('click', openModal);

function openModal() {
    document.getElementById('standbyModal').style.display = 'block';
}

function closeModalAutomationPage() {
    document.getElementById('standbyModal').style.display = 'none';

}

// Populate standby list
function populateStandbyList() {
    const container = document.getElementById('standbyList');
    container.innerHTML = standbyFunctions.map(func => `
            <div class="standbyItem">
                <img src="${func.icon}" width="30" height="30">
                <span>${func.name}</span>
                <button onclick="addFunction(${func.id})" class="StandbyAddButton">
                    <img src="/icons/add.svg" width="15" height="15">
                </button>
            </div>
        `).join('');
}

// Add function logic
function addFunction(funcId) {
    const func = standbyFunctions.find(f => f.id === funcId);
    if (!addedFunctions.some(f => f.id === funcId)) {
        addedFunctions.push(func);
        localStorage.setItem('addedFunctions', JSON.stringify(addedFunctions));
        renderAddedFunctions();
    }
}

// Render added functions
function renderAddedFunctions() {
    const container = document.getElementById('functionContainer');
    container.innerHTML = addedFunctions.map(func => `
            <div class="normalCard" data-id="${func.id}">
                <div class="function-header">
                    <img src="${func.icon}" width="30" height="30">
                    <h4>${func.name}</h4>
                    <button onclick="removeFunction(${func.id})" class="removeFunctionButton">
                        <img src="/icons/remove.svg" width="100%" height="100%">
                    </button>
                </div>
                <!-- Add function-specific UI elements here -->
            </div>
        `).join('');



    addedFunctions.forEach(func => {
        if (func.id === 5) { // ID 5 is for the Clock function
            loadClockScript();
        }
    });
}

function loadClockScript() {
    const existingScript = document.getElementById("clockScript");
    if (!existingScript) {
        const script = document.createElement("script");
        script.src = "/js/clock.js";
        script.id = "clockScript";
        document.body.appendChild(script);
    }
}

// Remove function
function removeFunction(funcId) {
    addedFunctions = addedFunctions.filter(f => f.id !== funcId);
    localStorage.setItem('addedFunctions', JSON.stringify(addedFunctions));
    renderAddedFunctions();
}
