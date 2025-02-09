//Apply saved theme immediately before page renders
(function () {
    const rootElement = document.documentElement;
    const savedTheme = localStorage.getItem("selectedTheme");

    if (savedTheme) {
        rootElement.classList.add(savedTheme);
    }

    // Listen for theme updates from AI or settings page
    window.addEventListener("storage", (event) => {
        if (event.key === "selectedTheme") {
            rootElement.classList.remove("light-theme", "dark-theme", "black-theme");
            rootElement.classList.add(event.newValue);
            console.log(`Theme updated across pages: ${event.newValue}`);
        }
    });
})();


function switchTheme(theme) {
    const rootElement = document.documentElement;

    // Remove old theme and apply new one
    rootElement.classList.remove("light-theme", "dark-theme", "black-theme");
    if (theme !== "light-theme") {
        rootElement.classList.add(theme);
    }

    // Save theme to `localStorage`
    localStorage.setItem("selectedTheme", theme);
    console.log(`Theme switched to: ${theme}`);
}


window.switchTheme = switchTheme;


document.addEventListener("DOMContentLoaded", function () {
    const button = document.querySelector(".ui-menu-icon");


    const isDarkMode = document.documentElement.classList.contains("dark-theme");

    if (isDarkMode) {
        button.style.color = "white";
    } else {
        button.style.color = "black";
    }
});



const ShinyText = ({ text, disabled = false, speed = 5, className = '' }) => {
    const animationDuration = `${speed}s`;

    return (
        <div
            className={`shiny-text ${disabled ? 'disabled' : ''} ${className}`}
            style={{ animationDuration }}
        >
            {text}
        </div>
    );
};

export default ShinyText;
