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
    document.querySelector(".image-selector img.selected").src;
    if (!roomName) {
        alert("Please enter a room name.");
        return;
    }

    // Read existing room data
    let rooms = JSON.parse(localStorage.getItem("rooms")) || [];



    // Sort by timestamp (newest first)
    rooms.sort((a, b) => b.timestamp - a.timestamp);


    localStorage.setItem("rooms", JSON.stringify(rooms));

    // Close modal
    closeModal();

    // Re-render Automation Card
    renderRooms();
}


// Load room data and render to automation card
function renderRooms() {
    let rooms = JSON.parse(localStorage.getItem("rooms")) || [];
    let container = document.getElementById("automationcard");

    // 清空原有内容
    container.innerHTML = `
        <div class='leftToRightList'> 
            <h3>Rooms</h3>
            <div class="hButton" id="automation" onclick="openPopout()">
                <span style="flex: 1; text-align: center;">Edit</span>
            </div>
        </div>
        <div id="roomList" class="room-list"></div>
    `;

    let roomList = document.getElementById("roomList");

    // If no rooms, display a message
    if (rooms.length === 0) {
        let noRoomMessage = document.createElement("p");
        noRoomMessage.innerText = "No rooms added.";
        noRoomMessage.style.color = "gray";
        noRoomMessage.style.textAlign = "center";
        roomList.appendChild(noRoomMessage);
        return;
    }

    // Iterate over room data and display in automation card
    rooms.forEach(room => {
        let roomDiv = document.createElement("div");
        roomDiv.className = "room-entry";
        roomDiv.style.backgroundImage = `url('${room.wallpaper}')`;
        roomDiv.style.backgroundSize = "cover";

        // 房间名称
        let roomNameSpan = document.createElement("span");
        roomNameSpan.innerText = room.name;

        // 删除按钮
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