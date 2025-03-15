document.addEventListener("DOMContentLoaded", async function () {
    const addMemberForm = document.getElementById("addMemberForm");
    const modal = document.getElementById("addMemberModal");
    const userInfoContainer = document.getElementById("userInfo");
    const circleContainer = document.querySelector(".circle-container");

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
            alert("Session expired, please log in again.");
            localStorage.removeItem("token");
            window.location.href = "../pages/signinPage.html";
        }
    } catch (error) {
        alert("Server error. Please try again later.");
    }

    addMemberForm.addEventListener("submit", function (event) {
        event.preventDefault();

        const memberName = document.getElementById("memberName").value;
        const memberImage = document.getElementById("memberImage").value || "https://randomuser.me/api/portraits/lego/1.jpg";

        const smallCircle = document.createElement("div");
        smallCircle.classList.add("small-circle");
        smallCircle.innerHTML = `<img src="${memberImage}" alt="${memberName}" title="${memberName}">`;

        circleContainer.appendChild(smallCircle);
        positionSmallCircles(); // 重新排列
        closeAddModal();
        addMemberForm.reset();
    });

    window.onclick = function (event) {
        if (event.target === modal) {
            closeAddModal();
        }
    };

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
            closeAddModal();
        }
    });

    function positionSmallCircles() {
        const smallCircles = document.querySelectorAll(".small-circle");
        const total = smallCircles.length;
        if (total === 0) return;

        const containerRect = circleContainer.getBoundingClientRect();
        const parentCenterX = containerRect.width / 2;
        const parentCenterY = containerRect.height / 2;


        const radius = Math.min(200, containerRect.width / 3);

        smallCircles.forEach((circle, index) => {
            let angle = (index / total) * 2 * Math.PI;
            if (total === 1) angle = 0;

            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            circle.style.position = "absolute";
            circle.style.transform = `translate(${parentCenterX + x}px, ${parentCenterY + y}px) translate(-50%, -50%)`;
        });
    }
});

function openAddModal() {
    document.getElementById("addMemberModal").style.display = "flex";
}

function closeAddModal() {
    document.getElementById("addMemberModal").style.display = "none";
}