var timeP


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
                weeklyReport.style.display = 'block'; // Show weeklyReport for "Week"
                monthlyReport.style.display = 'none';
                yearlyReport.style.display = 'none';
            } else if (selectedOption === 'Month') {
                weeklyReport.style.display = 'none';
                monthlyReport.style.display = 'block'; // Show monthlyReport for "Month"
                yearlyReport.style.display = 'none';
            }
            else if (selectedOption === 'Year') {
                weeklyReport.style.display = 'none';
                monthlyReport.style.display = 'none';
                yearlyReport.style.display = 'block'; // Show yearlyReport for "Year"
                }
        });
    });
});

// Function to create a chart dynamically
function createChart(containerId, chartTitle, labels, dataPoints) {
    // Create a chart container
    const container = document.createElement('div');
    container.className = 'chart-container';

    // Create a canvas element
    const canvas = document.createElement('canvas');
    canvas.id = `${containerId}-canvas`;
    container.appendChild(canvas);

    // Append the container to the specified location
    document.getElementById(containerId).appendChild(container);

    // Configure the chart
    const data = {
        labels: labels,
        datasets: [{
            label: chartTitle,
            data: dataPoints,
            borderColor: 'rgba(75, 192, 192, 1)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            tension: 0.4,
            pointRadius: 5
        }]
    };

    const config = {
        type: 'line',
        data: data,
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'top' },
                title: {
                    display: true,
                    text: chartTitle
                }
            },
            scales: {
                x: { title: { display: true, text: 'X-Axis' } },
                y: { title: { display: true, text: 'Y-Axis' }, beginAtZero: true }
            }
        }
    };

    // Render the chart
    const ctx = canvas.getContext('2d');
    new Chart(ctx, config);
}

// Example usage
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Fetch data from a separate file (e.g., data.json)
        const response = await fetch('/exampleData/data.json');
        const data = await response.json();

        // Use the fetched data to create charts
        createChart('chartSection1', data.energyUsage.title, data.energyUsage.labels, data.energyUsage.dataPoints);
        createChart('chartSection2', data.revenue.title, data.revenue.labels, data.revenue.dataPoints);
    } catch (error) {
        console.error('Error loading chart data:', error);
    }
});