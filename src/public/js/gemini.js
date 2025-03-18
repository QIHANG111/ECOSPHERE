// Secure API Key (Store it securely, don't expose publicly)
const API_KEY = "AIzaSyDoSgt53bNbO6Rlqs0QMJjCr9zHofxLtwA"; // Replace with a secure environment variable
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${API_KEY}`;




// Fetch AI Response from Gemini API
async function fetchGeminiResponse(prompt) {
    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        const data = await response.json();
        console.log("API Response:", data);

        if (data?.candidates?.length > 0) {
            return data.candidates[0].content.parts[0].text;
        } else {
            return "No valid response from Gemini API.";
        }
    } catch (error) {
        console.error("Error:", error);
        return "Error fetching response.";
    }
}

// Device Control
function updateDeviceTemperature(deviceName, newTemperature) {
    fetch("/api/update-temperature", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ name: deviceName, temperature: newTemperature })
    })
        .then(response => response.json())
        .then(data => {
            if (!data.success) {
                console.error("Failed to update device temperature:", data.message);
            } else {
                console.log(`[INFO] Updated ${deviceName} temperature to ${newTemperature}°C`);
            }
        })
        .catch(error => console.error("Error updating device temperature:", error));
}


document.addEventListener("DOMContentLoaded", function () {
    const deviceList = document.getElementById("deviceList");

    function loadDevices() {
        fetch("/api/devices")
            .then(response => response.json())
            .then(devices => {
                deviceList.innerHTML = "";

                devices.forEach(device => {
                    const deviceItem = document.createElement("div");
                    deviceItem.classList.add("hBar");

                    const nameSpan = document.createElement("span");
                    nameSpan.textContent = device.device_name;
                    nameSpan.style.marginRight = "10px";

                    const statusBtn = document.createElement("button");
                    statusBtn.classList.add("device-status-btn");
                    statusBtn.dataset.deviceName = device.device_name;

                    updateButtonAppearance(statusBtn, device.status === "true");

                    statusBtn.addEventListener("click", function () {
                        const currentStatus = device.status === "true";
                        const newStatus = !currentStatus; // 每次点击都重新从device获取状态

                        updateDeviceStatus(device.device_name, newStatus).then(() => {

                            updateButtonAppearance(statusBtn, newStatus);
                            device.status = newStatus.toString();


                            if (device.device_type === "AC") {
                                const tempControls = deviceItem.querySelector(".temperature-control");
                                const tempDisplay = deviceItem.querySelector(".temperature-display");
                                const displayStyle = newStatus ? "flex" : "none";
                                const tempDisplayStyle = newStatus ? "block" : "none";
                                if (tempControls) tempControls.style.display = displayStyle;
                                if (tempDisplay) tempDisplay.style.display = tempDisplayStyle;
                            }
                        }).catch(error => {
                            console.error("Error updating device status:", error);
                        });
                    });

                    deviceItem.appendChild(nameSpan);
                    deviceItem.appendChild(statusBtn);
                    deviceList.appendChild(deviceItem);

                    if (device.device_type === "AC") {
                        createTempControls(device, deviceItem);
                    }
                });
            })
            .catch(error => console.error("Error loading devices:", error));
    }


    function createTempControls(device, deviceItem) {
        const tempControlContainer = document.createElement("div");
        tempControlContainer.classList.add("temperature-control");
        tempControlContainer.style.display = device.status === "true" ? "flex" : "none";

        const tempDisplay = document.createElement("div");
        tempDisplay.classList.add("temperature-display");
        tempDisplay.textContent = `${String(device.temperature).padStart(2, ' ')}°C`;
        tempDisplay.style.display = device.status === "true" ? "block" : "none";

        const decreaseBtn = document.createElement("button");
        decreaseBtn.classList.add("temp-btn");
        decreaseBtn.textContent = "−";
        decreaseBtn.addEventListener("click", function() {
            if (device.temperature > 16) {
                device.temperature -= 1;
                updateDeviceTemperature(device.device_name, device.temperature);
                tempDisplay.textContent = `${String(device.temperature).padStart(2, ' ')}°C`;
            }
        });

        const increaseBtn = document.createElement("button");
        increaseBtn.classList.add("temp-btn");
        increaseBtn.textContent = "+";
        increaseBtn.addEventListener("click", function() {
            if (device.temperature < 30) {
                device.temperature += 1;
                updateDeviceTemperature(device.device_name, device.temperature);
                tempDisplay.textContent = `${String(device.temperature).padStart(2, ' ')}°C`;
            }
        });

        tempControlContainer.appendChild(decreaseBtn);
        tempControlContainer.appendChild(increaseBtn);
        deviceItem.appendChild(tempDisplay);
        deviceItem.appendChild(tempControlContainer);
    }

    function updateDeviceTemperature(deviceName, newTemperature) {
        fetch("/api/update-device", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: deviceName, temperature: newTemperature })
        })
            .then(response => response.json())
            .then(data => {
                if (!data.success) {
                    console.error("Failed to update device temperature:", data.message);
                }
            })
            .catch(error => console.error("Error updating device temperature:", error));
    }

    loadDevices();
});


function updateButtonAppearance(button, isOn) {
    if (isOn) {
        button.classList.add("device-status-on");
        button.classList.remove("device-status-off");
        button.textContent = "ON";
    } else {
        button.classList.add("device-status-off");
        button.classList.remove("device-status-on");
        button.textContent = "OFF";
    }
}



function updateDeviceStatus(deviceName, newStatus) {
    return fetch("/api/update-device", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: deviceName, status: newStatus })
    })
        .then(response => response.json())
        .then(data => {
            if (!data.success) {
                throw new Error(data.message);
            }
        });
}


// AI Theme & Device Control
function handleGeminiRequest() {
    const userPrompt = document.getElementById("userPrompt").value.trim();
    const responseElement = document.getElementById("apiResponse");
    const aiCard = document.querySelector(".aiCard");

    if (!userPrompt) {
        responseElement.innerText = "Please enter a question.";
        return;
    }

    const fullPrompt = `
You are an AI assistant. Follow these instructions carefully:
- Do Not generate more than 100 words.
- If the user wants to know the energy usage or reports, reply with "reportPage."
- If the user wants to set profile settings or edit passward / email or log out, reply with "settingsPage."
- If the user wants to add or delete a device, reply with "devicePage".
- If the user's message wants to change to a specific theme mode, reply only with "Ok, changed to"+light/dark/black+theme.
- If the message does not, respond normally.
- If the message wants to know what you can do/who are you, reply with "I am ECOSPHERE AI, I can help you with energy reports, change settings, and more.".
- if want to turn on or off devices, reply with "Ok, turned on/off the "+devicename.
User Input: "${userPrompt}"
AI Response:`;

    responseElement.innerText = "Fetching response...";
    fetchGeminiResponse(fullPrompt).then(responseText => {
        aiCard.style.height = "auto";
        const aiResponseText = responseText;
        responseElement.innerText = "";
        typeTextEffect(responseElement, aiResponseText, 50, aiCard);

        // AI Device Control
        const deviceActionMatch = aiResponseText.match(/Ok,\s*turned\s*(on|off)\s*the\s*([a-zA-Z0-9\s]+)/i);
        if (deviceActionMatch) {
            const action = deviceActionMatch[1].toLowerCase();
            const deviceNameFromAI = deviceActionMatch[2].trim().toLowerCase();

            fetch("/api/devices")
                .then(res => res.json())
                .then(devices => {
                    const matchedDevice = devices.find(d => d.device_name.toLowerCase() === deviceNameFromAI);

                    if (matchedDevice) {
                        const status = action === "on";
                        updateDeviceStatus(matchedDevice.device_name, status).then(() => {
                            console.log("Device status updated successfully.");
                            refreshButtonStatus(matchedDevice.device_name, status);
                        }).catch(err => {
                            console.error("Error updating device status:", err);
                        });
                    } else {
                        console.error("No matching device found:", deviceNameFromAI);
                    }
                }).catch(err => {
                console.error("Error fetching devices:", err);
            });
        }

        // AI Temperature Control
        const tempMatch = aiResponseText.match(/Set\s*([a-zA-Z0-9\s]+)\s*to\s*(\d+)°C/i);
        if (tempMatch) {
            const deviceNameFromAI = tempMatch[1].trim().toLowerCase();
            const temperature = parseInt(tempMatch[2]);

            fetch("/api/devices")
                .then(res => res.json())
                .then(devices => {
                    const matchedDevice = devices.find(d => d.device_name.toLowerCase() === deviceNameFromAI && d.device_type === "AC");
                    if (matchedDevice) {
                        updateDeviceTemperature(matchedDevice.device_name, temperature).then(() => {
                            console.log("Temperature updated successfully.");
                            refreshTemperatureDisplay(matchedDevice.device_name, temperature);
                        });
                    } else {
                        console.error("No matching AC device found:", deviceNameFromAI);
                    }
                }).catch(err => console.error("Error fetching devices:", err));
        }

        // AI theme control, pages
        if (aiResponseText.includes("Ok, changed to dark theme")) switchTheme("dark-theme");
        else if (aiResponseText.includes("Ok, changed to black theme")) switchTheme("black-theme");
        else if (aiResponseText.includes("Ok, changed to light theme")) switchTheme("light-theme");

        if (aiResponseText.includes("reportPage")) window.location.href = "../pages/reportPage.html";
        if (aiResponseText.includes("settingsPage")) window.location.href = "../pages/settingPage.html";
        if (aiResponseText.includes("devicePage")) window.location.href = "../pages/devicesPage.html";
    });
}

function refreshButtonStatus(deviceName, isOn) {
    const buttons = document.querySelectorAll(".device-status-btn");
    buttons.forEach(btn => {
        if (btn.dataset.deviceName === deviceName) {
            btn.textContent = isOn ? "ON" : "OFF";
            btn.classList.toggle("device-status-on", isOn);
            btn.classList.toggle("device-status-off", !isOn);

            const deviceItem = btn.parentElement;
            const tempControl = deviceItem.querySelector(".temperature-control");
            const tempDisplay = deviceItem.querySelector(".temperature-display");
            if (tempControl) tempControl.style.display = isOn ? "flex" : "none";
            if (tempDisplay) tempDisplay.style.display = isOn ? "block" : "none";
        }
    });
}


function refreshTemperatureDisplay(deviceName, newTemperature) {
    const buttons = document.querySelectorAll(".device-status-btn");
    buttons.forEach(btn => {
        if (btn.dataset.deviceName === deviceName) {
            const deviceItem = btn.parentElement;
            const tempDisplay = deviceItem.querySelector(".temperature-display");
            if (tempDisplay) tempDisplay.textContent = `${String(newTemperature).padStart(2, ' ')}°C`;
        }
    });
}



// Typing Effect
function typeTextEffect(element, text, speed) {
    let i = 0;
    element.innerHTML = "";
    element.style.opacity = "1";

    function type() {
        if (i < text.length) {
            let span = document.createElement("span");
            span.textContent = text.charAt(i);
            span.style.opacity = "0";
            span.style.transition = "opacity 0.2s ease, font-size 0.2s ease";
            span.style.fontSize = "1.5em";
            span.style.fontFamily = '"Arial", sans-serif';

            element.appendChild(span);
            setTimeout(() => {
                span.style.opacity = "1";
                span.style.fontSize = "1.2em";
            }, 1);

            i++;
            setTimeout(type, speed);
        }
    }
    type();
}

// Theme Switching
function switchTheme(theme) {
    const rootElement = document.documentElement;
    rootElement.classList.remove("light-theme", "dark-theme", "black-theme");

    if (theme !== "light-theme") {
        rootElement.classList.add(theme);
    }

    localStorage.setItem("selectedTheme", theme);
    console.log(`🎨 Theme switched to: ${theme}`);
}

window.switchTheme = switchTheme;

// AI Theme Commands
function handleAICommand(command) {
    const lowerCaseCommand = command.toLowerCase();
    let newTheme = null;

    if (lowerCaseCommand.includes("dark mode")) {
        newTheme = "dark-theme";
    } else if (lowerCaseCommand.includes("black mode")) {
        newTheme = "black-theme";
    } else if (lowerCaseCommand.includes("light mode")) {
        newTheme = "light-theme";
    }

    if (newTheme) {
        switchTheme(newTheme);
        console.log(`AI switched theme to: ${newTheme}`);
    }
}

window.handleAICommand = handleAICommand;

// Hide AI Response on Click Outside
window.onload = function () {
    document.addEventListener("click", function (event) {
        const aiCard = document.querySelector(".aiCard");
        const responseElement = document.getElementById("apiResponse");

        if (!aiCard.contains(event.target)) {
            aiCard.style.height = "8vh";
            responseElement.innerText = "";
        }
    });

};

// Voice Recognition
document.addEventListener("DOMContentLoaded", function () {
    const inputField = document.getElementById("userPrompt");
    const micButton = document.getElementById("micButton");
    const clearButton = document.getElementById("clearButton");

    clearButton.addEventListener("click", function () {
        inputField.value = "";
        clearButton.style.display = "none";
    });

    inputField.addEventListener("input", function () {
        clearButton.style.display = inputField.value.trim() !== "" ? "inline" : "none";
    });

    micButton.addEventListener("click", function () {
        if (!('webkitSpeechRecognition' in window)) {
            alert("Your browser does not support speech recognition.");
            return;
        }

        const recognition = new webkitSpeechRecognition();
        recognition.lang = "en-US";

        recognition.onstart = function () {
            micButton.textContent = "🎙️";
        };

        recognition.onspeechend = function () {
            recognition.stop();
            micButton.textContent = "🎤";
        };

        recognition.onresult = function (event) {
            inputField.value = event.results[0][0].transcript;
            clearButton.style.display = "inline";
        };

        recognition.onerror = function () {
            micButton.textContent = "🎤";
        };

        recognition.start();
    });
});