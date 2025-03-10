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


document.addEventListener("DOMContentLoaded", function () {
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
            maintainAspectRatio: false, // Ensure this is set to false
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


    async function fetchData() {
        try {
            const response = await fetch('/api/energy-usage'); // API
            const data = await response.json();


            const labels = data.map(item => item.date.split("T")[0]); // (YYYY-MM-DD)
            const energyUsage = data.map(item => item.energyusage);


            myChart.data.labels = labels;
            myChart.data.datasets[0].data = energyUsage;
            myChart.update();
        } catch (error) {
            console.error("❌ Error fetching data:", error);
        }
    }


    fetchData();
});



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