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


fetch('../assets/example/homepageReport.txt')
    .then(response => response.text())
    .then(data => {
        document.getElementById('text-content').innerText = data;
    })
    .catch(error => console.error('Error fetching the text file:', error));