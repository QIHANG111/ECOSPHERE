document.addEventListener("DOMContentLoaded", async function () {
    const addMemberForm = document.getElementById("addMemberForm");
    const modal = document.getElementById("addMemberModal");
    const userInfoContainer = document.getElementById("userInfo");

    // get`token`
    const token = localStorage.getItem("token");
    if (!token) {
        alert("Please log in first.");
        window.location.href = "../pages/signinPage.html";
        return;
    }


    try {
        const response = await fetch("/api/user", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const user = await response.json();

        if (response.ok) {
            console.log("[DEBUG] Current User:", user);
            userInfoContainer.innerHTML = `<strong> ${user.name} </strong>`;
        } else {
            console.error("[ERROR] Fetching user:", user.message);
            alert("Session expired, please log in again.");
            localStorage.removeItem("token");
            window.location.href = "../pages/signinPage.html";
        }
    } catch (error) {
        console.error("[ERROR] Fetching user:", error);
        alert("Server error. Please try again later.");
    }


    addMemberForm.addEventListener("submit", function (event) {
        event.preventDefault();

        const memberName = document.getElementById("memberName").value;
        const memberImage = document.getElementById("memberImage").value || "https://randomuser.me/api/portraits/lego/1.jpg";
        const memberInfo = document.getElementById("memberInfo").value;

        const familyCard = document.createElement("div");
        familyCard.classList.add("family-card");
        familyCard.innerHTML = `
            <h5>${memberName}</h5>
            <img src="${memberImage}" alt="${memberName}">
            <p>${memberInfo}</p>
        `;

        const dashboardContent = document.querySelector(".dashboard-content");
        dashboardContent.insertBefore(familyCard, document.querySelector(".add-card"));

        closeAddModal();
        addMemberForm.reset();
    });


    window.onclick = function(event) {
        if (event.target === modal) {
            closeAddModal();
        }
    };

    document.addEventListener("keydown", function(event) {
        if (event.key === "Escape") {
            closeAddModal();
        }
    });
});


function openAddModal() {
    document.getElementById("addMemberModal").style.display = "flex";
}


function closeAddModal() {
    document.getElementById("addMemberModal").style.display = "none";
}