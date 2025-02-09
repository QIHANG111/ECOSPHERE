//Secure API Key (Store it securely, don't expose publicly)
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

//Fake Data Generator (for Testing AI on Energy Reports)
async function generateByJson() {
    try {
        const response = { json: async () => ({
                timestamp: "2024-02-07T12:00:00Z",
                total_usage_kWh: 123.45,
                peak_hours: ["10:00-12:00", "18:00-20:00"],
                devices: [
                    { name: "Air Conditioner", usage_kWh: 50 },
                    { name: "Refrigerator", usage_kWh: 20 },
                    { name: "Washing Machine", usage_kWh: 15 },
                    { name: "Television", usage_kWh: 5 },
                    { name: "Lighting", usage_kWh: 8 }
                ]
            })};

        const jsonData = await response.json();
        console.log("Fetched Data:", jsonData);

        const fullPrompt = `Here is electric usage data, analyze it:\n${JSON.stringify(jsonData, null, 2)}`;
        const aiResponse = await fetchGeminiResponse(fullPrompt);

        document.getElementById("apiResponse").innerText = aiResponse;
        return aiResponse;
    } catch (error) {
        console.error("Error in generateByJson:", error);
        document.getElementById("apiResponse").innerText = "Error processing the request.";
    }
}

// Handle AI Requests & Theme Switching
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
- If the user's message wants to change to a specific theme mode, reply only with "Ok, changed to"+light/dark/black+theme.
- If the message does not, respond normally.
- If the message wants to know what you can do/who are you, reply with "I am ECOSPHERE AI, I can help you with energy reports, change settings, and more.".
User Input: "${userPrompt}"
AI Response:`;
    responseElement.innerText = "Fetching response...";
    fetchGeminiResponse(fullPrompt).then(responseText => {
        aiCard.style.height = "auto";
        let aiResponseText = responseText;
        responseElement.innerText = ""; // Clear placeholder text
        typeTextEffect(responseElement, aiResponseText, 50, aiCard);
        if (aiResponseText.includes("Ok, changed to dark theme")) {
            switchTheme("dark-theme");

        } else if (aiResponseText.includes("Ok, changed to black theme")) {
            switchTheme("black-theme");

        } else if (aiResponseText.includes("Ok, changed to light theme")) {
            switchTheme("light-theme");
        }
    });
    // **AI Theme Change Commands**
}

/**
 * Typing Effect with `.aiCard` Expansion
 * @param {HTMLElement} element - The text container
 * @param {string} text - The AI response text
 * @param {number} speed - Typing speed in milliseconds
 * @param {HTMLElement} card - The `.aiCard` that expands dynamically
 */
function typeTextEffect(element, text, speed, card) {
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

//Hide AI Response on Click Outside
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

// Universal Theme Switching System (AI & Settings Page)
function switchTheme(theme) {
    const rootElement = document.documentElement;

    // Remove old theme and apply new one
    rootElement.classList.remove("light-theme", "dark-theme", "black-theme");
    if (theme !== "light-theme") {
        rootElement.classList.add(theme);
    }

    // Save theme to `localStorage`
    localStorage.setItem("selectedTheme", theme);
    console.log(`🎨 Theme switched to: ${theme}`);
}

// Expose `switchTheme()` globally so AI & settings can use it
window.switchTheme = switchTheme;

// Ensure AI Can Switch Themes via Commands
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

//Make AI Theme Switching Available Globally
window.handleAICommand = handleAICommand;




// Initialize Voice Input Button on Page Load
window.onload = function () {
    document.addEventListener("click", function (event) {
        const aiCard = document.querySelector(".aiCard");
        const responseElement = document.getElementById("apiResponse");

        if (!aiCard.contains(event.target)) {
            aiCard.style.height = "8vh";
            responseElement.innerText = "";
        }
    });

    // Initialize the voice input button
    setupVoiceRecognition();
};

document.addEventListener("DOMContentLoaded", function () {
    const inputField = document.getElementById("userPrompt");
    const micButton = document.getElementById("micButton");
    const clearButton = document.getElementById("clearButton");


    clearButton.addEventListener("click", function () {
        inputField.value = "";
        clearButton.style.display = "none";
    });


    inputField.addEventListener("input", function () {
        if (inputField.value.trim() !== "") {
            clearButton.style.display = "inline";
        } else {
            clearButton.style.display = "none";
        }
    });

    // 语音识别功能
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
            const transcript = event.results[0][0].transcript;
            inputField.value = transcript;
            clearButton.style.display = "inline";
        };

        recognition.onerror = function () {
            micButton.textContent = "🎤";
        };

        recognition.start();
    });
});