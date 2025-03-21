// Room management script for the new API structure

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
    console.log("Auth token status:", token ? "Found token" : "No token available");
    return token;
}

// Get the current user's active house
async function getCurrentUserHouse() {
    console.log("Getting current user's house");
    const token = getAuthToken();
    if (!token) {
        console.error("No authentication token found");
        return null;
    }

    try {
        // First, get houses owned by the user
        const response = await fetch('/api/houses/owned', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            console.error(`Failed to get user's houses, status: ${response.status}`);
            return null;
        }

        const data = await response.json();
        console.log("User houses data:", data);

        if (!data.success || !data.houses || data.houses.length === 0) {
            console.error("No houses found for user");
            return null;
        }

        // For now, just return the first house (typically a user's main house)
        // In a more advanced implementation, you might want to add house selection
        return data.houses[0];
    } catch (error) {
        console.error("Error fetching user's houses:", error);
        return null;
    }
}

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

        // Create the room record in MongoDB using the updated endpoint
        const roomResponse = await fetch(`/api/houses/${house._id}/rooms/add-room`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                room_name: roomName,
                room_type: roomType
            })
        });

        console.log("API response status:", roomResponse.status);

        if (!roomResponse.ok) {
            const errorData = await roomResponse.json();
            console.error("API error response:", errorData);
            throw new Error(errorData.error || 'Failed to create room');
        }

        const roomData = await roomResponse.json();
        console.log("Room created successfully:", roomData);

        // Save wallpaper info to localStorage (since backend API doesn't have a wallpaper field)
        let wallpapers = JSON.parse(localStorage.getItem("roomWallpapers")) || {};
        wallpapers[roomData.room._id] = selectedImage;
        localStorage.setItem("roomWallpapers", JSON.stringify(wallpapers));

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

// Fetch rooms from the API
async function fetchRooms() {
    console.log("Fetching rooms from database");

    const token = getAuthToken();
    if (!token) {
        console.error("No authentication token found");
        return [];
    }

    try {
        // First, get the current house ID
        const house = await getCurrentUserHouse();
        if (!house) {
            console.error("Could not determine current house");
            return [];
        }

        console.log(`Fetching rooms for house ${house._id}`);

        // Get the rooms for this house
        const response = await fetch(`/api/houses/${house._id}/rooms`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log("Rooms API response status:", response.status);

        if (!response.ok) {
            console.error(`Failed to get rooms, status: ${response.status}`);
            return [];
        }

        const data = await response.json();
        console.log("Rooms retrieved from API:", data);

        if (!data.success || !data.rooms) {
            console.error("Invalid or empty rooms data returned from API");
            return [];
        }

        return data.rooms;
    } catch (error) {
        console.error("Error fetching rooms from API:", error);
        return [];
    }
}

// Load and render rooms in automationcard
async function renderRooms() {
    console.log("Rendering rooms in automationcard");
    const container = document.getElementById("automationcard");

    if (!container) {
        console.error("automationcard element not found!");
        return;
    }

    const rooms = await fetchRooms();
    const wallpapers = JSON.parse(localStorage.getItem("roomWallpapers")) || {};

    console.log(`Rendering ${rooms.length} rooms`);

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

    const roomList = document.getElementById("roomList");

    if (!roomList) {
        console.error("roomList element not found after creation!");
        return;
    }

    // If no rooms exist, show message
    if (!rooms || rooms.length === 0) {
        console.log("No rooms to display");
        let noRoomMessage = document.createElement("p");
        noRoomMessage.innerText = "No rooms. Click the + icon to add a room.";
        noRoomMessage.style.color = "gray";
        noRoomMessage.style.textAlign = "center";
        roomList.appendChild(noRoomMessage);
        return;
    }

    // Get the current house for deletion purposes
    const house = await getCurrentUserHouse();

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
        roomDiv.style.minHeight = "80px";

        // Room name
        let roomNameSpan = document.createElement("span");
        roomNameSpan.innerText = room.room_name;

        // Room type indicator (if available)
        if (room.room_type) {
            let roomTypeSpan = document.createElement("small");
            roomTypeSpan.innerText = room.room_type;
            roomTypeSpan.style.opacity = "0.7";
            roomTypeSpan.style.fontSize = "0.8em";
            roomTypeSpan.style.display = "block";
            roomDiv.appendChild(roomTypeSpan);
        }

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
            if (house) {
                removeRoom(house._id, roomId);
            } else {
                alert("Could not determine which house this room belongs to.");
            }
        };

        roomDiv.appendChild(roomNameSpan);
        roomDiv.appendChild(deleteButton);
        roomList.appendChild(roomDiv);
    });
}

// Delete a single room
async function removeRoom(houseId, roomId) {
    console.log(`Attempting to remove room ${roomId} from house ${houseId}`);
    if (confirm("Are you sure you want to delete this room?")) {
        const token = getAuthToken();
        if (!token) {
            alert("You need to be logged in to delete a room.");
            return;
        }

        try {
            console.log(`Sending delete request for room ${roomId}`);
            const response = await fetch(`/api/houses/${houseId}/rooms/delete-room/${roomId}`, {
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

    // Debug logging for token
    const token = getAuthToken();
    console.log("Auth token available:", !!token);
});

// Debugging function
window.debugRoomSystem = async function() {
    console.log("=== ROOM SYSTEM DEBUG ===");

    const token = getAuthToken();
    console.log("Auth token:", token ? "Present" : "Missing");

    const house = await getCurrentUserHouse();
    console.log("Current House:", house);

    if (house) {
        try {
            const response = await fetch(`/api/houses/${house._id}/rooms`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            console.log("Rooms API Response:", data);
        } catch (error) {
            console.error("Error testing rooms API:", error);
        }
    }

    console.log("automationcard element:", document.getElementById("automationcard"));
    console.log("roomModal element:", document.getElementById("roomModal"));
    console.log("=== END DEBUG ===");

    return "Debug info logged to console";
};