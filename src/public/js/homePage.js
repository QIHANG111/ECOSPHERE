// Open Add Room modal
function openPopout() {
    document.getElementById("roomModal").style.display = "flex";
}

// Close Add Room modal
function closeModal() {
    document.getElementById("roomModal").style.display = "none";
}

// Select room wallpaper
function selectImage(img) {
    document.querySelectorAll(".image-selector img").forEach(image => {
        image.classList.remove("selected");
    });
    img.classList.add("selected");
}

// Enable "Save" button when input is not empty
function toggleSaveButton() {
    const input = document.getElementById("roomName");
    const saveButton = document.querySelector(".save");
    if (input.value.trim().length > 0) {
        saveButton.classList.add("enabled");
        saveButton.onclick = saveRoom;
    } else {
        saveButton.classList.remove("enabled");
        saveButton.onclick = null;
    }
}

// Save room data to localStorage
function saveRoom() {
    let roomName = document.getElementById("roomName").value.trim();
    let selectedImage = document.querySelector(".image-selector img.selected")?.src;

    if (!roomName) {
        alert("Please enter a room name.");
        return;
    }

    if (!selectedImage) {
        alert("Please select a wallpaper.");
        return;
    }

    // Retrieve existing rooms from localStorage
    let rooms = JSON.parse(localStorage.getItem("rooms")) || [];

    // Add new room
    rooms.push({
        name: roomName,
        wallpaper: selectedImage,
        timestamp: new Date().getTime()
    });

    // Sort rooms by timestamp (newest first)
    rooms.sort((a, b) => b.timestamp - a.timestamp);

    // Save updated rooms to localStorage
    localStorage.setItem("rooms", JSON.stringify(rooms));

    // Close modal and refresh the room list
    closeModal();
    renderRooms();
}

// Clear all rooms
function clearRooms() {
    if (confirm("Are you sure you want to delete all rooms?")) {
        localStorage.removeItem("rooms"); // Remove stored data
        renderRooms(); // Refresh UI
    }
}

// Load and render rooms in automationcard
function renderRooms() {
    let rooms = JSON.parse(localStorage.getItem("rooms")) || [];
    let container = document.getElementById("automationcard");

    // Clear previous content
    container.innerHTML = `
        <div class='leftToRightList'> 
            <h3 style="padding-left: 10vw">Rooms</h3>
            <button class="hidden-button ui-menu-icon " style="width: 5vw; height: 3.5vw" id="automation" onclick="openPopout()">
             <img src="/icons/add-cross.svg" alt="Vector Icon" width="20" height="20">
            </buttonb>
        </div>
        <div id="roomList" class="room-list"></div>
    `;

    let roomList = document.getElementById("roomList");

    // If no rooms exist, show message
    if (rooms.length === 0) {
        let noRoomMessage = document.createElement("p");
        noRoomMessage.innerText = "No rooms.";
        noRoomMessage.style.color = "gray";
        noRoomMessage.style.textAlign = "center";
        roomList.appendChild(noRoomMessage);
        return;
    }

    // Display each room in the automationcard
    rooms.forEach(room => {
        let roomDiv = document.createElement("div");
        roomDiv.className = "room-entry";
        roomDiv.style.backgroundImage = `url('${room.wallpaper}')`;
        roomDiv.style.backgroundSize = "cover";

        // Room name
        let roomNameSpan = document.createElement("span");
        roomNameSpan.innerText = room.name;

        // Delete button for individual rooms
        let deleteButton = document.createElement("button");
        deleteButton.innerText = "❌";
        deleteButton.style.backgroundColor = "rgba(255,0,0,0)";
        deleteButton.style.color = "white";
        deleteButton.style.border = "none";
        deleteButton.style.padding = "3px 6px";
        deleteButton.style.borderRadius = "5px";
        deleteButton.style.cursor = "pointer";
        deleteButton.style.width = "4vw";
        deleteButton.onclick = function () {
            removeRoom(room.name);
        };

        roomDiv.appendChild(roomNameSpan);
        roomDiv.appendChild(deleteButton);
        roomList.appendChild(roomDiv);
    });
}

// Delete a single room
function removeRoom(roomName) {
    let rooms = JSON.parse(localStorage.getItem("rooms")) || [];
    let updatedRooms = rooms.filter(room => room.name !== roomName);
    localStorage.setItem("rooms", JSON.stringify(updatedRooms));
    renderRooms();
}

// Render rooms on page load
document.addEventListener("DOMContentLoaded", renderRooms);

//test

    let temperature = 24;
    const minTemp = 16;
    const maxTemp = 30;

    function drawGauge(temp) {
    const canvas = document.getElementById('gaugeCanvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 80;


    const startAngle = Math.PI * 0.75;
    const endAngle = Math.PI * 2.25;
    const range = maxTemp - minTemp;
    const angle = startAngle + ((temp - minTemp) / range) * (endAngle - startAngle);


    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#ddd';
    ctx.stroke();


    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, angle);
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#007BFF';
    ctx.stroke();
}

    function updateDisplay() {
    document.getElementById('temperatureValue').innerText = `${temperature}°C`;
    drawGauge(temperature);
}

    function changeTemperature(change) {
    temperature += change;
    if (temperature < minTemp) temperature = minTemp;
    if (temperature > maxTemp) temperature = maxTemp;
    updateDisplay();
}


    updateDisplay();
