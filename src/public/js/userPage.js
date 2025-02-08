
    document.addEventListener("DOMContentLoaded", function () {
    const addMemberForm = document.getElementById("addMemberForm");
    const modal = document.getElementById("addMemberModal");

    addMemberForm.addEventListener("submit", function (event) {
    event.preventDefault();

    // Get form values
    const memberName = document.getElementById("memberName").value;
    const memberImage = document.getElementById("memberImage").value || "https://randomuser.me/api/portraits/lego/1.jpg";
    const memberInfo = document.getElementById("memberInfo").value;

    // Create new family card
    const familyCard = document.createElement("div");
    familyCard.classList.add("family-card");

    familyCard.innerHTML = `
                <h5>${memberName}</h5>
                <img src="${memberImage}" alt="${memberName}">
                <p>${memberInfo}</p>
            `;

    // Append to dashboard
    const dashboardContent = document.querySelector(".dashboard-content");
    dashboardContent.insertBefore(familyCard, document.querySelector(".add-card"));

    // Close modal and reset form
    closeAddModal();
    addMemberForm.reset();
});

    // Close modal when clicking outside
    window.onclick = function(event) {
    if (event.target === modal) {
    closeAddModal();
}
};

    // Close modal with ESC key
    document.addEventListener("keydown", function(event) {
    if (event.key === "Escape") {
    closeAddModal();
}
});
});

    // Open modal
    function openAddModal() {
    document.getElementById("addMemberModal").style.display = "flex";
}

    // Close modal
    function closeAddModal() {
    document.getElementById("addMemberModal").style.display = "none";
}
