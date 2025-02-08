document.addEventListener("DOMContentLoaded", function () {
    const ctx = document.getElementById('myChart').getContext('2d');

    const myChart = new Chart(ctx, {
        type: 'bar', // Change to 'line', 'pie'
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'Energy Usage (kWh)',
                data: [120, 150, 180, 220, 260, 300],
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,  // Ensures the chart resizes
            maintainAspectRatio: false,  // Allows full expansion
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });

    // Resize chart dynamically
    window.addEventListener('resize', function () {
        myChart.resize();
    });
});