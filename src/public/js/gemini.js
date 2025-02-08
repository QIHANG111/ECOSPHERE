const API_KEY = "AIzaSyDoSgt53bNbO6Rlqs0QMJjCr9zHofxLtwA";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

async function fetchGeminiResponse(prompt) {
    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();
        console.log("API Response:", data);

        if (data && data.candidates && data.candidates.length > 0) {
            return data.candidates[0].content.parts[0].text;
        } else {
            return "No valid response from Gemini API.";
        }
    } catch (error) {
        console.error("Error:", error);
        return "Error fetching response.";
    }
}
async function generateByJson() {
    try {
        // Use fake JSON data instead of fetching from backend
        const response = {
            ok: true,
            json: async () => ({
                "timestamp": "2024-02-07T12:00:00Z",
                "total_usage_kWh": 123.45,
                "peak_hours": ["10:00-12:00", "18:00-20:00"],
                "devices": [
                    { "name": "Air Conditioner", "usage_kWh": 50 },
                    { "name": "Refrigerator", "usage_kWh": 20 },
                    { "name": "Washing Machine", "usage_kWh": 15 },
                    { "name": "Television", "usage_kWh": 5 },
                    { "name": "Lighting", "usage_kWh": 8 }
                ]
            })
        }; // Fake response object for testing



        const jsonData = await response.json();
        console.log("Fetched Data:", jsonData); // Debugging log

        const formattedData = JSON.stringify(jsonData, null, 2);
        const preSettingText = "Here is electric usage data, analyze it and provide insights within 50 words:\n";
        const fullPrompt = preSettingText + formattedData;

        const aiResponse = await fetchGeminiResponse(fullPrompt);

        document.getElementById("apiResponse").innerText = aiResponse; // Display response in UI
        return aiResponse;
    } catch (error) {
        console.error("Error in generateByJson:", error);
        document.getElementById("apiResponse").innerText = "Error processing the request.";
    }
}


function handleGeminiRequest() {
    const userPrompt = document.getElementById("userPrompt").value;
    const responseElement = document.getElementById("apiResponse");
    const aiCard = document.querySelector(".aiCard"); // Select `.aiCard`
    const preSettingText = "Answer the question within 50 words:\n";
    const fullPrompt = preSettingText + userPrompt;

    if (userPrompt.trim() === "") {
        responseElement.innerText = "Please enter a question.";
        return;
    }

    // Show loading message and expand `.aiCard`
    responseElement.innerText = "Fetching response...";
    // aiCard.style.height = "10vh"; // Initial expansion

    fetchGeminiResponse(fullPrompt).then(responseText => {
        responseElement.innerText = ""; // Clear placeholder text
        // aiCard.style.height = "auto";

        // Start the typing effect
        typeTextEffect(responseElement, responseText, 50, aiCard);
    });
}

/**
 * Typing effect with `.aiCard` expansion
 * @param {HTMLElement} element - Text container
 * @param {string} text - AI response text
 * @param {number} speed - Typing speed in ms
 * @param {HTMLElement} card - `.aiCard` that expands
 */
function typeTextEffect(element, text, speed, card) {
    let i = 0;
    element.innerHTML = ""; // Clear previous text
    element.style.opacity = "1"; // Ensure text is visible

    function type() {
        if (i < text.length) {
            let span = document.createElement("span");
            span.textContent = text.charAt(i);
            span.style.opacity = "0";
            span.style.transition = "opacity 0.2s ease, font-size 0.2s ease";
            span.style.fontSize = "1.5em";

            element.appendChild(span);

            setTimeout(() => {
                span.style.opacity = "1"; // Fade in character
                span.style.fontSize = "1.2em";
                card.style.height = card.scrollHeight + "px"; // Dynamically expand height
            }, 3);

            i++;
            setTimeout(type, speed);
        }
    }
    type(); // Start typing effect
}

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