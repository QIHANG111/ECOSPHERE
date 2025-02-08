// Immediately apply theme before page renders


(function () {
    const rootElement = document.documentElement;
    const savedTheme = localStorage.getItem("selectedTheme");

    if (savedTheme) {
        rootElement.classList.add(savedTheme);
    }
})();