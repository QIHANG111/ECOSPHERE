const menuItems = document.querySelectorAll(".menu-item");


menuItems.forEach((item) => {
    item.addEventListener("click", () => {
        const targetPage = item.getAttribute("data-target");

        //redirect to the target page
        if (targetPage) {
            window.location.href = targetPage;
        }
    });
});