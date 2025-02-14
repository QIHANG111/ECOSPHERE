document.addEventListener("DOMContentLoaded", function () {
    const rootElement = document.documentElement;
    const lightTheme = document.getElementById("light-theme");
    const darkTheme = document.getElementById("dark-theme");
    const blackTheme = document.getElementById("black-theme");

    const savedTheme = localStorage.getItem("selectedTheme");

    if (savedTheme) {
        rootElement.classList.add(savedTheme);

        if (savedTheme === "dark-theme") {
            darkTheme.checked = true;
        } else if (savedTheme === "black-theme") {
            blackTheme.checked = true;
        } else {
            lightTheme.checked = true;
        }
    }

    function switchTheme(theme) {
        rootElement.classList.remove("light-theme", "dark-theme", "black-theme");
        if (theme !== "light-theme") {
            rootElement.classList.add(theme);
        }
        localStorage.setItem("selectedTheme", theme);
    }

    lightTheme.addEventListener("change", () => switchTheme("light-theme"));
    darkTheme.addEventListener("change", () => switchTheme("dark-theme"));
    blackTheme.addEventListener("change", () => switchTheme("black-theme"));
});