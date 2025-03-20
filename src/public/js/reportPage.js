const API_KEY = "AIzaSyDoSgt53bNbO6Rlqs0QMJjCr9zHofxLtwA";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${API_KEY}`;

let selectedTimeRange = 'weekly';
let chartType = 'bar';
let currentDate = new Date();

// Store all data from database
let allEnergyData = [];

function prevPeriod() {
    if (selectedTimeRange === 'weekly') {
        // Create a copy of the current date
        const tempDate = new Date(currentDate);

        // First align to the current Monday
        const mondayDate = alignToMonday(tempDate);

        // Then go back 7 days to get to previous Monday
        mondayDate.setDate(mondayDate.getDate() - 7);

        // Update the current date to be previous Monday
        currentDate = new Date(mondayDate);
    } else if (selectedTimeRange === 'monthly') {
        // Set to the first day of current month
        const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

        // Go back one day to reach previous month
        firstDay.setDate(0);

        // Set to first day of previous month
        currentDate = new Date(firstDay.getFullYear(), firstDay.getMonth(), 1);
    } else if (selectedTimeRange === 'yearly') {
        // Set to January 1st of previous year
        currentDate = new Date(currentDate.getFullYear() - 1, 0, 1);
    }

    // Log the date range for debugging
    const range = getDateRange();
    console.log(`Switched to previous ${selectedTimeRange} period: ${range.start} to ${range.end}`);

    updateChartAndReport();
}

function nextPeriod() {
    if (selectedTimeRange === 'weekly') {
        // Create a copy of the current date
        const tempDate = new Date(currentDate);

        // First align to the current Monday
        const mondayDate = alignToMonday(tempDate);

        // Then go forward 7 days to get to next Monday
        mondayDate.setDate(mondayDate.getDate() + 7);

        // Update the current date to be next Monday
        currentDate = new Date(mondayDate);
    } else if (selectedTimeRange === 'monthly') {
        // Set to the first day of next month
        currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    } else if (selectedTimeRange === 'yearly') {
        // Set to January 1st of next year
        currentDate = new Date(currentDate.getFullYear() + 1, 0, 1);
    }

    // Log the date range for debugging
    const range = getDateRange();
    console.log(`Switched to next ${selectedTimeRange} period: ${range.start} to ${range.end}`);

    updateChartAndReport();
}

/**
 * Helper function: Aligns a date to the Monday of its week
 * Important: Returns a new date object instead of modifying the original
 */
function alignToMonday(dateObj) {
    // Create a copy of the date
    const result = new Date(dateObj);

    const dayOfWeek = result.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
    // Calculate offset to Monday: Sunday(0) → 6 days, Monday(1) → 0 days, Tuesday(2) → 1 day...
    const offsetToMonday = (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
    result.setDate(result.getDate() - offsetToMonday);

    return result;
}

function getDateRange() {
    if (selectedTimeRange === 'weekly') {
        // Get Monday of current week
        const mondayDate = alignToMonday(new Date(currentDate));

        // A week spans from Monday to Sunday
        const startOfWeek = new Date(mondayDate);
        const endOfWeek = new Date(mondayDate);
        endOfWeek.setDate(mondayDate.getDate() + 6); // +6 days → Sunday

        return {
            start: formatDate(startOfWeek),
            end: formatDate(endOfWeek)
        };
    } else if (selectedTimeRange === 'monthly') {
        // Get first and last day of the current month
        const y = currentDate.getFullYear();
        const m = currentDate.getMonth();

        const startOfMonth = new Date(y, m, 1);
        // Setting day 0 of next month = last day of current month
        const endOfMonth = new Date(y, m + 1, 0);

        return {
            start: formatDate(startOfMonth),
            end: formatDate(endOfMonth)
        };
    } else if (selectedTimeRange === 'yearly') {
        // Get first and last day of the current year
        const y = currentDate.getFullYear();
        const startOfYear = new Date(y, 0, 1);      // January 1st
        const endOfYear = new Date(y, 11, 31);      // December 31st

        return {
            start: formatDate(startOfYear),
            end: formatDate(endOfYear)
        };
    }

    // Fallback
    return { start: null, end: null };
}

function toggleDropdown() {
    const dropdown = document.getElementById("dropdownMenu");
    dropdown.classList.toggle("show");
}

function toggleDropdownChart() {
    const dropdown = document.getElementById("dropdownMenu2");
    dropdown.classList.toggle("show");
}

window.onclick = function (event) {
    if (!event.target.matches('.dropdown-btn')) {
        const dropdowns = document.getElementsByClassName("dropdown-content");
        for (let i = 0; i < dropdowns.length; i++) {
            dropdowns[i].classList.remove("show");
        }
    }
};

const weeklyReport = document.getElementById('weeklyReport');
const monthlyReport = document.getElementById('monthlyReport');
const yearlyReport = document.getElementById('yearlyReport');
const reportCard = document.getElementById('reportCard');

document.addEventListener('DOMContentLoaded', async () => {
    // Time range toggle
    const rangeOptions = document.querySelectorAll('#dropdownMenu a');
    rangeOptions.forEach(option => {
        option.addEventListener('click', async function (e) {
            selectedTimeRange = e.target.getAttribute('data-range');

            // Show/hide different titles based on selection
            weeklyReport.style.display = (selectedTimeRange === 'weekly') ? 'block' : 'none';
            monthlyReport.style.display = (selectedTimeRange === 'monthly') ? 'block' : 'none';
            yearlyReport.style.display = (selectedTimeRange === 'yearly') ? 'block' : 'none';

            // Update chart & report
            updateChartAndReport();
        });
    });

    // Chart type toggle
    const chartTypeOptions = document.querySelectorAll('#dropdownMenu2 a');
    chartTypeOptions.forEach(option => {
        option.addEventListener('click', function (e) {
            chartType = e.target.getAttribute('data-chart');
            changeChartType(chartType);
        });
    });

    // On page load, set current date to today aligned to Monday for weekly view
    if (selectedTimeRange === 'weekly') {
        currentDate = alignToMonday(new Date());
    } else {
        currentDate = new Date();
    }

    // Fetch all data once when page loads
    await fetchAllData();

    // Display the current time range
    updatePeriodDisplay();

    // Update the chart
    updateChartAndReport();
});

const ctx = document.getElementById('myChart').getContext('2d');
const myChart = new Chart(ctx, {
    type: chartType,
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

function changeChartType(newType) {
    myChart.config.type = newType;
    myChart.update();
}

function formatDate(dateObj) {
    const date = new Date(dateObj);

    const year = date.getFullYear();
    let month = date.getMonth() + 1;
    let day = date.getDate();

    if (month < 10) month = '0' + month;
    if (day < 10) day = '0' + day;

    return `${year}-${month}-${day}`;
}

// Parse ISO date string to Date object (handles "2025-03-21" format)
function parseISODate(dateStr) {
    const [year, month, day] = dateStr.split('-').map(num => parseInt(num, 10));
    return new Date(year, month - 1, day);
}

// Check if a date is within a given range
function isDateInRange(dateStr, startDateStr, endDateStr) {
    const date = parseISODate(dateStr);
    const startDate = parseISODate(startDateStr);
    const endDate = parseISODate(endDateStr);

    return date >= startDate && date <= endDate;
}

function generateWeekLabels() {
    const isoDates = [];
    const displayLabels = [];

    // Get this week's start/end
    const { start, end } = getDateRange();
    const startOfWeek = new Date(start);

    console.log(`Generating week labels for period: ${start} to ${end}`);

    // 7 days of the week
    const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    for (let i = 0; i < 7; i++) {
        let tmp = new Date(startOfWeek);
        tmp.setDate(tmp.getDate() + i);

        // 1) ISO format → "2025-03-21"
        const isoStr = formatDate(tmp);
        isoDates.push(isoStr);

        // 2) Display format → "Mon 3/21"
        displayLabels.push(`${weekDays[i]} ${tmp.getMonth() + 1}/${tmp.getDate()}`);
    }

    console.log('ISO dates array:', isoDates);
    console.log('Display labels array:', displayLabels);

    return { isoDates, displayLabels };
}

function generateMonthLabels() {
    const isoDates = [];
    const displayLabels = [];

    const { start, end } = getDateRange();
    const startOfMonth = new Date(start);
    const endOfMonth = new Date(end);

    console.log(`Generating month labels for period: ${start} to ${end}`);

    // Get the number of days in the month
    const daysInMonth = endOfMonth.getDate();

    // Generate a label for each day of the month
    for (let d = 1; d <= daysInMonth; d++) {
        let tmp = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth(), d);

        // ISO format
        const isoStr = formatDate(tmp);
        isoDates.push(isoStr);

        // Display format → "3/1"
        displayLabels.push(`${tmp.getMonth() + 1}/${d}`);
    }

    console.log(`Generated ${isoDates.length} day labels for month view`);

    return { isoDates, displayLabels };
}

function generateYearLabels() {
    const isoDates = [];
    const displayLabels = [];

    const y = currentDate.getFullYear();
    console.log(`Generating year labels for: ${y}`);

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // Generate a label for each month of the year
    for (let m = 0; m < 12; m++) {
        let tmp = new Date(y, m, 1);

        // ISO format for first day of month
        const isoStr = formatDate(tmp);
        isoDates.push(isoStr);

        // Display format → "Jan 2025"
        displayLabels.push(`${monthNames[m]} ${y}`);
    }

    return { isoDates, displayLabels };
}

function updatePeriodDisplay() {
    const { start, end } = getDateRange();

    // Update title display
    if (selectedTimeRange === 'weekly') {
        weeklyReport.textContent = `Weekly Report (${start} to ${end})`;
    } else if (selectedTimeRange === 'monthly') {
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        monthlyReport.textContent = `Monthly Report (${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()})`;
    } else if (selectedTimeRange === 'yearly') {
        yearlyReport.textContent = `Yearly Report (${currentDate.getFullYear()})`;
    }
}

// Fetch all energy data once
async function fetchAllData() {
    try {
        // Build API URL - fetch all available data
        const apiUrl = `/api/energy-usage/all`;
        console.log(`Fetching all energy data from: ${apiUrl}`);

        // Fallback to range-based API if "all" endpoint doesn't exist
        // Using a large date range to get all data
        const fallbackUrl = `/api/energy-usage?range=all&start=2020-01-01&end=2030-12-31`;

        try {
            let response = await fetch(apiUrl);

            // If "all" endpoint doesn't exist, use fallback
            if (!response.ok) {
                console.log("All data endpoint not available, using fallback");
                response = await fetch(fallbackUrl);
            }

            if (!response.ok) {
                throw new Error(`API returned error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            if (!Array.isArray(data)) {
                throw new TypeError(`Expected an array, but received: ${typeof data}`);
            }

            // Sort data by date ascending
            data.sort((a, b) => {
                return new Date(a.date) - new Date(b.date);
            });

            allEnergyData = data;
            console.log(`Successfully loaded ${allEnergyData.length} data points`);

            return data;
        } catch (error) {
            console.error("Failed to fetch data:", error);
            return [];
        }
    } catch (error) {
        console.error("Error in fetchAllData:", error);
        allEnergyData = [];
        return [];
    }
}

function updateChartAndReport() {
    try {
        // First update the period display
        updatePeriodDisplay();

        // 1) Calculate the period start/end
        const { start, end } = getDateRange();
        console.log(`Processing data for range: ${start} to ${end}`);

        // 2) Filter data for the selected date range
        const filteredData = allEnergyData.filter(item => {
            const dateStr = item.date.split("T")[0]; // Remove time part
            return isDateInRange(dateStr, start, end);
        });

        console.log(`Filtered ${filteredData.length} data points for the selected range`);

        // Log the date range of filtered data for debugging
        if (filteredData.length > 0) {
            console.log('Filtered data range:',
                filteredData[0].date.split('T')[0],
                'to',
                filteredData[filteredData.length-1].date.split('T')[0]);
        }

        // 3) Prepare labels and data arrays for the chart
        let displayLabels = [], usageDataArr = [];

        if (selectedTimeRange === 'weekly') {
            // Weekly view: 7 days
            const { isoDates, displayLabels: wLabels } = generateWeekLabels();
            displayLabels = wLabels;

            // Create a map of dates to usage values
            const usageMap = {};
            filteredData.forEach(item => {
                // Ensure consistent date format - keep only the date part, remove time
                const dayStr = item.date.split("T")[0];
                usageMap[dayStr] = item.energyusage;
            });

            // Track which dates have data and which don't
            const datesWithData = [];
            const datesWithoutData = [];

            // Map each expected date to its usage value (or 0 if no data)
            usageDataArr = isoDates.map(d => {
                if (d in usageMap) {
                    datesWithData.push(d);
                    return usageMap[d];
                } else {
                    datesWithoutData.push(d);
                    return 0; // Fill with 0 for dates without data
                }
            });

            console.log('Dates with data:', datesWithData);
            console.log('Dates without data:', datesWithoutData);

        } else if (selectedTimeRange === 'monthly') {
            // Monthly view: all days in month
            const { isoDates, displayLabels: mLabels } = generateMonthLabels();
            displayLabels = mLabels;

            // Create a map of dates to usage values
            const usageMap = {};
            filteredData.forEach(item => {
                const dayStr = item.date.split("T")[0];
                usageMap[dayStr] = item.energyusage;
            });

            // Track which dates have data and which don't
            const datesWithData = [];
            const datesWithoutData = [];

            // Map each expected date to its usage value (or 0 if no data)
            usageDataArr = isoDates.map(d => {
                if (d in usageMap) {
                    datesWithData.push(d);
                    return usageMap[d];
                } else {
                    datesWithoutData.push(d);
                    return 0; // Fill with 0 for dates without data
                }
            });

            console.log('Monthly view: Dates with data count:', datesWithData.length);
            console.log('Monthly view: Dates without data count:', datesWithoutData.length);

        } else if (selectedTimeRange === 'yearly') {
            // Yearly view: sum by month
            const { isoDates, displayLabels: yLabels } = generateYearLabels();
            displayLabels = yLabels;

            // Initialize monthly totals
            const monthlySum = new Array(12).fill(0);
            const monthlyDataCount = new Array(12).fill(0);

            // Group data by month
            filteredData.forEach(item => {
                const dateStr = item.date.split("T")[0]; // "2025-03-21"
                const [yyyy, mm, dd] = dateStr.split("-");
                const monthIndex = parseInt(mm, 10) - 1; // 0-11 for Jan-Dec

                if (monthIndex >= 0 && monthIndex < 12) {
                    const usage = parseFloat(item.energyusage) || 0;
                    monthlySum[monthIndex] += usage;
                    monthlyDataCount[monthIndex]++;
                }
            });

            usageDataArr = monthlySum;

            console.log('Yearly view: Data points count per month:', monthlyDataCount);
            console.log('Yearly view: Total usage per month:', monthlySum);
        }

        // 4) Update Chart.js
        myChart.data.labels = displayLabels;
        myChart.data.datasets[0].data = usageDataArr;
        myChart.update();

        // 5) Generate report
        if (filteredData.length > 0) {
            generateEnergyUsageReport(filteredData, displayLabels, usageDataArr)
                .then(report => {
                    reportCard.textContent = report;
                });
        } else {
            reportCard.textContent = `No data found for the period ${start} to ${end}. Please check your data source or select a different time range.`;
        }
    } catch (err) {
        console.error("Error updating chart/report:", err);
        reportCard.textContent = `Error loading data: ${err.message}`;
    }
}

async function generateEnergyUsageReport(energyData, fullLabels, usageDataArr) {
    try {
        if (!energyData || energyData.length === 0) {
            return "Invalid or empty energy usage data.";
        }

        const formattedData = fullLabels.map((label, index) => ({
            label: label,
            energyusage: usageDataArr[index]
        }));

        const prompt = `(0 means no data available for that day)Generate a report on the following ${selectedTimeRange} energy usage data within 150 words:\n\n`
            + JSON.stringify(formattedData, null, 2);

        const responseText = await fetchGeminiResponse(prompt);
        return responseText;
    } catch (error) {
        console.error("Error generating report:", error);
        return "Error generating report.";
    }
}

async function fetchGeminiResponse(prompt) {
    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            })
        });
        const data = await response.json();

        if (data?.candidates?.length > 0) {
            return data.candidates[0].content.parts[0].text;
        } else {
            return "No valid response from Gemini API.";
        }
    } catch (error) {
        console.error("Error fetching Gemini response:", error);
        return "Error fetching response.";
    }
}