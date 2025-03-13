// Secure API Key (Store it securely, don't expose publicly)
const API_KEY = "AIzaSyDoSgt53bNbO6Rlqs0QMJjCr9zHofxLtwA"; // Replace with a secure environment variable
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${API_KEY}`;
// Toggle dropdown
function toggleDropdown() {
    const dropdown = document.getElementById("dropdownMenu");
    dropdown.classList.toggle("show");
}

// Close dropdown when clicking outside
window.onclick = function (event) {
    if (!event.target.matches('.dropdown-btn')) {
        const dropdowns = document.getElementsByClassName("dropdown-content");
        for (let i = 0; i < dropdowns.length; i++) {
            dropdowns[i].classList.remove("show");
        }
    }
};

// Handle option selection
document.addEventListener('DOMContentLoaded', () => {
    const dropdownContent = document.querySelectorAll('.dropdown-content a');
    const weeklyReport = document.getElementById('weeklyReport');
    const monthlyReport = document.getElementById('monthlyReport');
    const yearlyReport = document.getElementById('yearlyReport');

    dropdownContent.forEach(option => {
        option.addEventListener('click', function (event) {
            const selectedOption = event.target.textContent;

            // Check which option is selected
            if (selectedOption === 'Week') {
                weeklyReport.style.display = 'block'; // Show weeklyReport
                monthlyReport.style.display = 'none';
                yearlyReport.style.display = 'none';
            } else if (selectedOption === 'Month') {
                weeklyReport.style.display = 'none';
                monthlyReport.style.display = 'block'; // Show monthlyReport
                yearlyReport.style.display = 'none';
            } else if (selectedOption === 'Year') {
                weeklyReport.style.display = 'none';
                monthlyReport.style.display = 'none';
                yearlyReport.style.display = 'block'; // Show yearlyReport
            }
        });
    });
});

// =============================================
// Main DOMContentLoaded for Chart + Report
// =============================================
document.addEventListener("DOMContentLoaded", async function () {
    // 1) Initialize the Chart.js chart
    const ctx = document.getElementById('myChart').getContext('2d');
    const myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Energy Usage (kWh)',
                data: [],
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 2,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, // Ensure chart scales properly
            scales: {
                x: {
                    type: 'category',
                    title: {
                        display: true,
                        text: 'Date'
                    }
                },
                y: {
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: 'Usage (kWh)'
                    }
                }
            }
        }
    });

    // 2) Fetch data for the chart
    try {
        const response = await fetch('/api/energy-usage'); // Your backend endpoint
        const data = await response.json();

        if (Array.isArray(data)) {
            const labels = data.map(item => item.date.split("T")[0]); // e.g. "YYYY-MM-DD"
            const usageData = data.map(item => item.energyusage);

            myChart.data.labels = labels;
            myChart.data.datasets[0].data = usageData;
            myChart.update();
        } else {
            console.error("❌ Fetched data is not an array:", data);
        }
    } catch (error) {
        console.error("❌ Error fetching data:", error);
    }

    // 3) Generate and display the usage report
    try {
        // generateEnergyUsageReport is your function that uses fetchData() + fetchGeminiResponse()
        const reportText = await generateEnergyUsageReport();

        // Insert the returned text into the "reportCard" element
        const reportCard = document.getElementById('reportCard');
        reportCard.textContent = reportText;
    } catch (err) {
        console.error("Error generating usage report:", err);
        document.getElementById('reportCard').textContent = "Error generating the report.";
    }
});

// =============================================
// The function that fetches data from /api/energy-usage
// and returns an array (currently used by generateEnergyUsageReport)
// =============================================
async function fetchData() {
    try {
        const response = await fetch('/api/energy-usage');
        const data = await response.json();

        if (!Array.isArray(data)) {
            throw new TypeError('Expected an array but received ' + typeof data);
        }
        return data;
    } catch (error) {
        console.error("❌ Error fetching data in fetchData():", error);
        return [];
    }
}

// =============================================
// Generate a short usage report via Gemini
// using the data from fetchData()
// =============================================
async function generateEnergyUsageReport() {
    try {
        // Step 1: Fetch energy usage data
        const energyData = await fetchData();
        if (!energyData || !Array.isArray(energyData) || energyData.length === 0) {
            throw new Error('Invalid or empty energy usage data');
        }

        // Step 2: Construct a prompt for the Gemini API
        const prompt = `Generate a brief report on the following energy usage data within 150 words\n\n${JSON.stringify(energyData, null, 2)}`;

        // Step 3: Fetch the report from the Gemini API
        const report = await fetchGeminiResponse(prompt);
        console.log("Energy Usage Report:", report);
        return report;
    } catch (error) {
        console.error("Error generating energy usage report:", error);
        return "Error generating report.";
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

