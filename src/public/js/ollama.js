// Ollama API 配置
const OLLAMA_API_URL = "http://localhost:11434/api/generate"; // 本地 Ollama 服务器

// 从 Ollama 获取 AI 响应
async function fetchOllamaResponse(prompt) {
    try {
        const response = await fetch(OLLAMA_API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "llama3.2",  // Ollama 的 AI 模型，可更换如 llama2、gemma
                prompt: prompt,
                stream: false       // 关闭流式响应，改为完整返回
            })
        });

        const data = await response.json();
        console.log("Ollama API Response:", data);

        if (data?.response) {
            return data.response.trim(); // Ollama 的响应字段为 `response`
        } else {
            return "No valid response from Ollama.";
        }
    } catch (error) {
        console.error("Error:", error);
        return "Error fetching response.";
    }
}

// 处理 AI 请求
function handleAIRequest() {
    const userPrompt = document.getElementById("userPrompt").value.trim().toLowerCase();
    const responseElement = document.getElementById("apiResponse");
    const aiCard = document.querySelector(".aiCard");

    if (!userPrompt) {
        responseElement.innerText = "Please enter a question.";
        return;
    }

    const fullPrompt = `
You are an AI assistant. Follow these instructions carefully:
- Do not generate more than 100 words.
- If the user's message wants to change to a specific theme mode, reply only with "Ok, changed to " + light/dark/black + " theme".
- If the message does not, respond normally.
- If the message wants to know what you can do/who you are, reply with "I am ECOSPHERE AI, I can help you with energy reports, change settings, and more.".
- If the user wants to turn on or off devices, reply with "Ok, turned on/off the " + device name.
User Input: "${userPrompt}"
AI Response:`;

    responseElement.innerText = "Fetching response...";
    fetchOllamaResponse(fullPrompt).then(responseText => {
        aiCard.style.height = "auto";
        responseElement.innerText = "";
        typeTextEffect(responseElement, responseText, 50, aiCard);

        // 设备控制解析
        const deviceActionMatch = responseText.match(/Ok, turned (on|off) the ([a-zA-Z0-9\s]+)/i);
        if (deviceActionMatch) {
            const action = deviceActionMatch[1]; // "on" "off"
            const deviceName = deviceActionMatch[2].trim();
            const status = action === "on"; // "on" -> true, "off" -> false

            console.log(`Updating Device: ${deviceName}, Status: ${status}`);
            updateDeviceStatus(deviceName.toUpperCase(), status);
        }

        // 主题切换解析
        if (responseText.includes("Ok, changed to dark theme")) {
            switchTheme("dark-theme");
        } else if (responseText.includes("Ok, changed to black theme")) {
            switchTheme("black-theme");
        } else if (responseText.includes("Ok, changed to light theme")) {
            switchTheme("light-theme");
        }
    });
}

// 文本打字效果
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

// 设备控制逻辑
function updateDeviceStatus(deviceName, newStatus) {
    fetch("/api/update-device", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: deviceName, status: newStatus })
    })
        .then(response => response.json())
        .then(data => {
            console.log("Updated:", data);
            document.querySelectorAll("input[data-device-name]").forEach(input => {
                if (input.dataset.deviceName === deviceName) {
                    input.checked = newStatus;
                }
            });
        })
        .catch(error => console.error("Error updating device:", error));
}

// 主题切换
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
window.updateDeviceStatus = updateDeviceStatus;
window.handleAIRequest = handleAIRequest;

// 监听用户输入
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