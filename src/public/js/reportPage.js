// Secure API Key (Store it securely, don't expose publicly)
const API_KEY = "AIzaSyDoSgt53bNbO6Rlqs0QMJjCr9zHofxLtwA"; // Replace with a secure environment variable
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${API_KEY}`;
let type = 'line';
// Toggle dropdown
function toggleDropdown() {
    const dropdown = document.getElementById("dropdownMenu");
    dropdown.classList.toggle("show");
}
function toggleDropdownChart() {
    const dropdown = document.getElementById("dropdownMenu2");
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

let selectedTimeRange = 'weekly';

// Handle option selection
document.addEventListener('DOMContentLoaded', () => {
    // "Select Range" dropdown
    const dropdownContent = document.querySelectorAll('#dropdownMenu a');
    dropdownContent.forEach(option => {
        option.addEventListener('click', async function (event) {
            selectedTimeRange = event.target.getAttribute('data-range');
            console.log("Selected range:", selectedTimeRange);
            // show/hide the weekly/monthly/yearly sections (if you have them)
            weeklyReport.style.display = selectedTimeRange === 'weekly' ? 'block' : 'none';
            monthlyReport.style.display = selectedTimeRange === 'monthly' ? 'block' : 'none';
            yearlyReport.style.display = selectedTimeRange === 'yearly' ? 'block' : 'none';

            // fetch new data & generate new report
            await updateChartAndReport();
        });
    });

    // "Chart Type" dropdown
    const chartTypeOptions = document.querySelectorAll('#dropdownMenu2 a');
    chartTypeOptions.forEach(option => {
        option.addEventListener('click', function (event) {
            const selectedType = event.target.getAttribute('data-chart');
            console.log("Selected chart type:", selectedType);
            changeChartType(selectedType);
        });
    });

    // initial load
    updateChartAndReport();
});


const ctx = document.getElementById('myChart').getContext('2d');
const myChart = new Chart(ctx, {
    type: type,
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
        maintainAspectRatio: false,
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
async function changeChartType(newType) {
    try {
        const energyData = await fetchData(selectedTimeRange);

        if (energyData.length > 0) {

            const labels = energyData.map(item => item.date.split("T")[0]);
            const usageData = energyData.map(item => item.energyusage);


            myChart.config.type = newType;
            myChart.data.labels = labels;
            myChart.data.datasets[0].data = usageData;
            myChart.update();
        } else {
            console.warn("⚠ No data available for selected range:", selectedTimeRange);
        }
    } catch (error) {
        console.error("Error updating chart and report:", error);
    }
}


async function updateChartAndReport() {
    try {
        const energyData = await fetchData(selectedTimeRange);

        if (energyData.length > 0) {

            const labels = energyData.map(item => item.date.split("T")[0]);
            const usageData = energyData.map(item => item.energyusage);

            myChart.data.labels = labels;
            myChart.data.datasets[0].data = usageData;
            myChart.update();


            document.getElementById('reportCard').textContent = await generateEnergyUsageReport(energyData);
        } else {
            console.warn("⚠ No data available for selected range:", selectedTimeRange);
            document.getElementById('reportCard').textContent = "No data available.";
        }
    } catch (error) {
        console.error("Error updating chart and report:", error);
        document.getElementById('reportCard').textContent = "Error loading data.";
    }
}


async function fetchData(timeRange) {
    try {
        const response = await fetch(`/api/energy-usage?range=${timeRange}`);
        const data = await response.json();

        if (!Array.isArray(data)) {
            throw new TypeError(`Expected an array but received ${typeof data}`);
        }


        let limit = 7; // 7
        if (timeRange === 'monthly') limit = 30;
        else if (timeRange === 'yearly') limit = 365;

        return data.slice(-limit); //  N
    } catch (error) {
        console.error(`❌ Error fetching ${timeRange} data:`, error);
        return [];
    }
}

// =============================================
//Gemini
// =============================================
async function generateEnergyUsageReport(energyData) {
    try {
        if (!energyData || energyData.length === 0) {
            throw new Error('Invalid or empty energy usage data');
        }

        const prompt = `Generate a brief report on the following ${selectedTimeRange} energy usage data within 150 words\n\n${JSON.stringify(energyData, null, 2)}`;
        const report = await fetchGeminiResponse(prompt);
        console.log("Generated Report:", report);
        return report;
    } catch (error) {
        console.error("Error generating energy usage report:", error);
        return "Error generating report.";
    }
}

// =============================================
// Gemini API
// =============================================
async function fetchGeminiResponse(prompt) {
    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        const data = await response.json();
        console.log("Gemini API Response:", data);

        if (data?.candidates?.length > 0) {
            return data.candidates[0].content.parts[0].text;
        } else {
            return "No valid response from Gemini API.";
        }
    } catch (error) {
        console.error("Error fetching response:", error);
        return "Error fetching response.";
    }
}



