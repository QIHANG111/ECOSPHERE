// Secure API Key (Store it securely, don't expose publicly)
const API_KEY = "AIzaSyDoSgt53bNbO6Rlqs0QMJjCr9zHofxLtwA"; // Replace with a secure environment variable
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${API_KEY}`;

//fetchData from API(energy-usage)
async function fetchData() {
    try {
        const response = await fetch('/api/energy-usage'); // API
        const data = await response.json();

        if (!Array.isArray(data)) {
            throw new TypeError('Expected an array but received ' + typeof data);
        }

        return data;
    } catch (error) {
        console.error("❌ Error fetching data:", error);
    }
}


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

                    const isOn = device.status === "true";

                    const statusBtn = document.createElement("button");
                    statusBtn.classList.add("device-status-btn");
                    statusBtn.dataset.deviceName = device.device_name;

                    if (isOn) {
                        statusBtn.classList.add("device-status-on");
                        statusBtn.textContent = "ON";
                    } else {
                        statusBtn.classList.add("device-status-off");
                        statusBtn.textContent = "OFF";
                    }
                    // statusBtn.dataset.deviceName = device.device_name;

                    statusBtn.addEventListener("click", function () {
                        const newStatus = !isOn;
                        updateDeviceStatus(device.device_name, newStatus);

                        if (newStatus) {
                            statusBtn.classList.remove("device-status-off");
                            statusBtn.classList.add("device-status-on");
                            statusBtn.textContent = "ON";
                        } else {
                            statusBtn.classList.remove("device-status-on");
                            statusBtn.classList.add("device-status-off");
                            statusBtn.textContent = "OFF";
                        }

                        device.status = newStatus.toString();
                    });



                    const deleteBtn = document.createElement("button");
                    deleteBtn.textContent = "delete";
                    deleteBtn.classList.add("delete-btn");
                    deleteBtn.dataset.deviceId = device._id;

                    deleteBtn.addEventListener("click", function () {
                        if (confirm(`Are you sure? Delete  "${device.device_name}"`)) {
                            deleteDevice(device._id);
                        }
                    });

                    deviceItem.appendChild(nameSpan);
                    deviceItem.appendChild(statusBtn);
                    // deviceItem.appendChild(deleteBtn);
                    deviceList.appendChild(deviceItem);


                    if (device.device_type === "AC") {
                        const tempControlContainer = document.createElement("div");
                        tempControlContainer.classList.add("temperature-control");
                        tempControlContainer.style.display = device.status ? "flex" : "none";


                        const tempDisplay = document.createElement("div");
                        tempDisplay.classList.add("temperature-display");
                        tempDisplay.textContent = `${String(device.temperature).padStart(2, ' ')}°C`;


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
                        tempDisplay.style.display = device.status ? "block" : "none";
                        deviceItem.appendChild(tempControlContainer);
                    }
                });
            })
            .catch(error => console.error("Error loading devices:", error));
    }

    function updateDeviceStatus(deviceName, newStatus) {
        fetch("/api/update-device", {
            method: "POST", // POST
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ name: deviceName, status: newStatus }) // 适配后端 API 参数
        })
            .then(response => response.json())
            .then(data => {
                if (!data.success) {
                    console.error("Failed to update device status:", data.message);
                }
            })
            .catch(error => console.error("Error updating device status:", error));
    }

    function updateDeviceTemperature(deviceName, newTemperature) {
        fetch("/api/update-device", {
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
                }
            })
            .catch(error => console.error("Error updating device temperature:", error));
    }

    function deleteDevice(deviceId) {
        fetch(`/api/device/${deviceId}`, {
            method: "DELETE"
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    console.log("Device deleted successfully");
                    loadDevices();
                } else {
                    console.error("Failed to delete device:", data.message);
                }
            })
            .catch(error => console.error("Error deleting device:", error));
    }

    loadDevices();
});

// AI Theme & Device Control
function handleGeminiRequest() {
    const userPrompt = document.getElementById("userPrompt").value.trim().toLowerCase();
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
- Tf the user wants to add or delete a device, reply with "devicePage".
- If the user's message wants to change to a specific theme mode, reply only with "Ok, changed to"+light/dark/black+theme.
- If the message does not, respond normally.
- If the message wants to know what you can do/who are you, reply with "I am ECOSPHERE AI, I can help you with energy reports, change settings, and more.".
- if want to turn on or off devices, reply with "Ok, turned on/off the "+devicename.
User Input: "${userPrompt}"
AI Response:`;
// - if want to see or check the report, reply with "Ok, this is the report "+reportname.(not usable right now)
    responseElement.innerText = "Fetching response...";
    fetchGeminiResponse(fullPrompt).then(responseText => {
        aiCard.style.height = "auto";
        let aiResponseText = responseText;
        responseElement.innerText = "";
        typeTextEffect(responseElement, aiResponseText, 50, aiCard);

        // Device Control by AI
        const deviceActionMatch = aiResponseText.match(/Ok, turned (on|off) the ([a-zA-Z0-9\s]+)/i);
        if (deviceActionMatch) {
            const action = deviceActionMatch[1]; // "on" "off"
            const deviceName = deviceActionMatch[2].trim();

            const status = action === "on"; // "on" -> true, "off" -> false
            console.log(`Updating Device: ${deviceName}, Status: ${status}`);

            updateDeviceStatus(deviceName.toUpperCase(), status);
            // loadDevices();
        }
        //temperature control by AI
        const tempMatch = aiResponseText.match(/Set ([a-zA-Z0-9\s]+) to (\d+)°C/i);
        if (tempMatch) {
            const deviceName = tempMatch[1].trim().toUpperCase();
            const temperature = parseInt(tempMatch[2]);
            console.log(`Updating ${deviceName} temperature to: ${temperature}`);
            updateDeviceTemperature(deviceName, temperature);
            // UI will be updated by the updateDeviceTemperature function
        }

// theme control by AI
        if (aiResponseText.includes("Ok, changed to dark theme")) {
            switchTheme("dark-theme");
        } else if (aiResponseText.includes("Ok, changed to black theme")) {
            switchTheme("black-theme");
        } else if (aiResponseText.includes("Ok, changed to light theme")) {
            switchTheme("light-theme");
        }

        // AI page jump
        if (aiResponseText.includes("reportPage")) {
            window.location.href = "../pages/reportPage.html";
        }
        if (aiResponseText.includes("settingsPage")) {
            window.location.href = "../pages/settingPage.html";
        }
        if (aiResponseText.includes("devicePage")) {
            window.location.href = "../pages/devicesPage.html";
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