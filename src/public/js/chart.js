document.addEventListener("DOMContentLoaded", function () {
    const ctx = document.getElementById('myChart').getContext('2d');


    const myChart = new Chart(ctx, {
        type: 'bar',//pie, bar, line
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
                    beginAtZero: true,
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

