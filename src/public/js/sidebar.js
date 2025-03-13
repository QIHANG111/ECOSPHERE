const menuItems = document.querySelectorAll(".menu-item");
const reportItems = document.querySelectorAll(".reportCard");
menuItems.forEach((item) => {
    item.addEventListener("click", () => {
        const targetPage = item.getAttribute("data-target");

        //redirect to the target page
        if (targetPage) {
            window.location.href = targetPage;
        }
    });
});
