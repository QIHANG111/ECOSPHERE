document.addEventListener("DOMContentLoaded", function () {
    const ctx = document.getElementById('myChart').getContext('2d');

    // 1. 先创建一个空的图表实例
    const myChart = new Chart(ctx, {
        type: 'bar', // 你也可以改成 'line' 等
        data: {
            // 如果想用time轴模式 (见下方options)：
            // datasets里的 data 就会是 {x, y}这种对象格式
            datasets: [{
                label: 'Energy Usage (kWh)',
                data: [], // 先置空，待fetch返回后填充
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    // 如果你想让x轴按时间分布，请设置:
                    type: 'time',
                    time: {
                        unit: 'day' // 可根据需要改成 'month', 'week' 等
                    },
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

    // 2. fetchData 函数，向后端接口获取数据
    async function fetchData() {
        try {
            const response = await fetch('/api/energy-usage');
            const data = await response.json();

            // data 应该是一个数组，每个对象形如：
            // {
            //   _id: "...",
            //   date: "2023-03-12T16:00:00.000Z",
            //   energyusage: 50,
            //   __v: 0
            // }
            //
            // 因此，我们直接用 item.date 和 item.energyusage 即可:
            const chartData = data.map(item => {
                return {
                    x: item.date,            // Chart.js会解析字符串为Date
                    y: parseFloat(item.energyusage)
                };
            });

            // 更新图表的数据
            myChart.data.datasets[0].data = chartData;
            myChart.update();

        } catch (error) {
            console.error('Error fetching data:', error);
        }
    }

    // 3. 页面加载后立刻执行获取数据
    fetchData();
});