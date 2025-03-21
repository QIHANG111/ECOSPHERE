// Room management script that works exclusively with the database

// Open Add Room modal
function openPopout() {
    console.log("Opening room modal");
    document.getElementById("roomModal").style.display = "flex";
}

// Close Add Room modal
function closeModal() {
    console.log("Closing room modal");
    document.getElementById("roomModal").style.display = "none";
    // Reset form
    document.getElementById("roomName").value = "";
    if (document.getElementById("roomType")) {
        document.getElementById("roomType").value = "bedroom"; // Default value
    }
    document.querySelectorAll(".image-selector img").forEach(image => {
        image.classList.remove("selected");
    });
    document.querySelector(".image-selector img").classList.add("selected");
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

// Get authentication token from localStorage or sessionStorage
function getAuthToken() {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    console.log("Auth token retrieved:", token ? "Token found" : "No token");
    return token;
}

// Save room data to backend API
// Save room data to backend API
async function saveRoom() {
    console.log("Attempting to save room to database");
    const roomName = document.getElementById("roomName").value.trim();
    const roomType = document.getElementById("roomType")?.value || "bedroom";
    const selectedImage = document.querySelector(".image-selector img.selected")?.src;

    if (!roomName) {
        alert("Please enter a room name.");
        return;
    }

    if (!selectedImage) {
        alert("Please select a wallpaper.");
        return;
    }

    const token = getAuthToken();
    if (!token) {
        alert("You need to be logged in to add a room.");
        return;
    }

    try {
        // First, get the current house ID
        const house = await getCurrentUserHouse();
        if (!house) {
            alert("Could not determine which house to add the room to. Please try again later.");
            return;
        }

        console.log(`Sending room creation request for house ${house._id}: ${roomName}`);

        // Looking at your API in paste.txt, we can see your backend only expects 'room_name'
        // and does not accept 'room_type' parameter in this endpoint
        const roomResponse = await fetch(`/api/houses/${house._id}/rooms/add-room`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                room_name: roomName
                // room_type removed as it's not expected by the API
            })
        });

        console.log("API response status:", roomResponse.status);
        console.log("Request payload:", JSON.stringify({ room_name: roomName }));

        if (!roomResponse.ok) {
            const errorData = await roomResponse.json();
            console.error("API error response:", errorData);
            throw new Error(errorData.error || 'Failed to create room');
        }

        const roomData = await roomResponse.json();
        console.log("Room created successfully:", roomData);

        // Save wallpaper info to localStorage (since backend API doesn't have a wallpaper field)
        let wallpapers = JSON.parse(localStorage.getItem("roomWallpapers")) || {};

        // Check the structure of the response to extract the room ID correctly
        const roomId = roomData.room?._id || roomData.room?.id || roomData._id;

        if (roomId) {
            wallpapers[roomId] = selectedImage;
            localStorage.setItem("roomWallpapers", JSON.stringify(wallpapers));
        } else {
            console.warn("Could not determine room ID from response:", roomData);
        }

        // Close the modal and refresh the room list
        closeModal();
        renderRooms();

        // Show success message
        alert("Room added successfully!");
    } catch (error) {
        console.error("Error saving room:", error);
        alert("Failed to save room: " + error.message);
    }
}

// Fetch rooms directly from the API
async function fetchRooms() {
    console.log("Fetching rooms from database");

    const token = getAuthToken();
    if (!token) {
        console.log("No auth token available");
        return [];
    }

    try {
        // First, get all rooms (if your API supports this)
        const response = await fetch('/api/rooms', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log("Rooms API response status:", response.status);

        if (!response.ok) {
            console.error("Failed to get rooms, status:", response.status);
            return [];
        }

        const data = await response.json();
        console.log("Rooms retrieved from API:", data);

        // Return the rooms array - adjust this based on your API response structure
        return data.rooms || data || [];
    } catch (error) {
        console.error("Error fetching rooms from API:", error);
        return [];
    }
}

// Load and render rooms in automationcard
async function renderRooms() {
    console.log("Rendering rooms in automationcard");
    let container = document.getElementById("automationcard");

    if (!container) {
        console.error("automationcard element not found!");
        return;
    }

    let rooms = await fetchRooms();
    let wallpapers = JSON.parse(localStorage.getItem("roomWallpapers")) || {};

    console.log(`Rendering ${rooms.length} rooms`);
    console.log("Wallpaper data:", wallpapers);

    // Clear previous content
    container.innerHTML = `
        <div class='leftToRightList'> 
            <h3 style="padding-left: 10vw">Rooms</h3>
            <button class="hidden-button ui-menu-icon" style="width: 5vw; height: 3.5vw" id="automation" onclick="openPopout()">
                <img src="/icons/add-cross.svg" alt="Vector Icon" width="20" height="20">
            </button>
        </div>
        <div id="roomList" class="room-list"></div>
    `;

    let roomList = document.getElementById("roomList");

    if (!roomList) {
        console.error("roomList element not found after creation!");
        return;
    }

    // If no rooms exist, show message
    if (!rooms || rooms.length === 0) {
        console.log("No rooms to display");
        let noRoomMessage = document.createElement("p");
        noRoomMessage.innerText = "No rooms.";
        noRoomMessage.style.color = "gray";
        noRoomMessage.style.textAlign = "center";
        roomList.appendChild(noRoomMessage);
        return;
    }

    // Display each room in the automationcard
    rooms.forEach(room => {
        console.log("Rendering room:", room);

        let roomDiv = document.createElement("div");
        roomDiv.className = "room-entry";

        // Get room ID
        const roomId = room._id;

        // Use stored wallpaper or default
        const wallpaper = wallpapers[roomId] || '/images/wp1.jpg';
        roomDiv.style.backgroundImage = `url('${wallpaper}')`;
        roomDiv.style.backgroundSize = "cover";

        // Room name
        let roomNameSpan = document.createElement("span");
        roomNameSpan.innerText = room.room_name;

        // Room type indicator
        let roomTypeSpan = document.createElement("small");
        roomTypeSpan.innerText = room.room_type || "room";
        roomTypeSpan.style.opacity = "0.7";
        roomTypeSpan.style.fontSize = "0.8em";
        roomTypeSpan.style.display = "block";

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
        deleteButton.onclick = function() {
            removeRoom(roomId);
        };

        roomDiv.appendChild(roomNameSpan);
        roomDiv.appendChild(roomTypeSpan);
        roomDiv.appendChild(deleteButton);
        roomList.appendChild(roomDiv);
    });
}

// Delete a single room
async function removeRoom(roomId) {
    console.log(`Attempting to remove room: ${roomId}`);
    if (confirm("Are you sure you want to delete this room?")) {
        const token = getAuthToken();
        if (!token) {
            alert("You need to be logged in to delete a room.");
            return;
        }

        try {
            console.log(`Sending delete request for room ${roomId}`);
            const response = await fetch(`/api/rooms/${roomId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            console.log("Delete API response status:", response.status);

            if (!response.ok) {
                const errorData = await response.json();
                console.error("API error response:", errorData);
                throw new Error(errorData.error || 'Failed to delete room');
            }

            // Also remove the wallpaper entry
            let wallpapers = JSON.parse(localStorage.getItem("roomWallpapers")) || {};
            delete wallpapers[roomId];
            localStorage.setItem("roomWallpapers", JSON.stringify(wallpapers));

            // Refresh the room list
            renderRooms();

            alert("Room deleted successfully!");
        } catch (error) {
            console.error("Error deleting room:", error);
            alert("Failed to delete room: " + error.message);
        }
    }
}

// Update HTML to add room type dropdown
function updateRoomModalHTML() {
    console.log("Updating room modal HTML");
    const modalBody = document.querySelector(".roomModal-body");
    if (!modalBody) {
        console.error("Modal body not found!");
        return;
    }

    // Check if room type field already exists
    if (document.getElementById("roomType")) {
        console.log("Room type dropdown already exists");
        return;
    }

    // Create room type dropdown after room name
    const roomNameField = document.getElementById("roomName");
    if (roomNameField) {
        console.log("Adding room type dropdown");
        const typeLabel = document.createElement("label");
        typeLabel.setAttribute("for", "roomType");
        typeLabel.innerText = "ROOM TYPE";

        const typeSelect = document.createElement("select");
        typeSelect.id = "roomType";
        typeSelect.style.marginBottom = "15px";
        typeSelect.style.padding = "8px";
        typeSelect.style.borderRadius = "5px";
        typeSelect.style.border = "1px solid #ccc";

        // Add room type options
        const roomTypes = ["bedroom", "living room", "kitchen", "bathroom", "office", "other"];
        roomTypes.forEach(type => {
            const option = document.createElement("option");
            option.value = type;
            option.innerText = type.charAt(0).toUpperCase() + type.slice(1);
            typeSelect.appendChild(option);
        });

        // Insert after room name input
        roomNameField.parentNode.insertBefore(typeLabel, roomNameField.nextSibling);
        roomNameField.parentNode.insertBefore(typeSelect, typeLabel.nextSibling);
        console.log("Room type dropdown added successfully");
    } else {
        console.error("Room name field not found!");
    }
}

// Render rooms on page load and update modal HTML
document.addEventListener("DOMContentLoaded", () => {
    console.log("Document loaded, initializing room management");
    updateRoomModalHTML();
    renderRooms();
});

// Debug function
window.debugRoomSystem = function() {
    console.log("=== ROOM SYSTEM DEBUG ===");
    console.log("localStorage 'roomWallpapers':", localStorage.getItem("roomWallpapers"));
    console.log("localStorage 'token':", localStorage.getItem("token"));
    console.log("automationcard element:", document.getElementById("automationcard"));
    console.log("roomModal element:", document.getElementById("roomModal"));

    // Try to fetch rooms directly
    fetch('/api/rooms', {
        headers: {
            'Authorization': `Bearer ${getAuthToken()}`
        }
    })
        .then(response => {
            console.log("Debug API call status:", response.status);
            return response.json();
        })
        .then(data => {
            console.log("Debug API response:", data);
        })
        .catch(error => {
            console.error("Debug API call error:", error);
        });

    console.log("=== END DEBUG ===");

    // Try to render rooms again
    renderRooms();

    return "Debug info logged to console";
};