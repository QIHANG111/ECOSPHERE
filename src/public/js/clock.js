function updateDateTime() {
    const now = new Date();


    const formattedDate = now.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const formattedTime = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });


    const dateTimeElement = document.getElementById("currentDateTime");
    if (dateTimeElement) {
        dateTimeElement.innerHTML = `
            <div class="date">${formattedDate}</div>
            <div class="time">${formattedTime}</div>
        `;
    }
}

setInterval(updateDateTime, 1000);
updateDateTime();


