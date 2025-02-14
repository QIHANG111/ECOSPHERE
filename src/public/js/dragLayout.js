document.addEventListener("DOMContentLoaded", function () {
    let dashboardContainer = document.getElementById("dashboardContainer");
    const maxCardsPerRow = 3; // Maximum

    function moveToNextAvailableRow(card, currentRow) {
        let nextRow = currentRow.nextElementSibling;

        while (nextRow && nextRow.classList.contains("dashboard-content")) {
            let nextRowCards = nextRow.querySelectorAll(".normalCard").length;
            if (nextRowCards < maxCardsPerRow) {
                nextRow.insertBefore(card, nextRow.firstChild);
                console.log("✅ Card moved to the next available row.");
                return;
            }
            nextRow = nextRow.nextElementSibling; // Move to the next row
        }

        let newRow = document.createElement("div");
        newRow.classList.add("dashboard-content");
        newRow.appendChild(card);
        dashboardContainer.appendChild(newRow);
        console.log("➕ Created a new row and moved the card.");
    }

    function initSortableForRows() {
        document.querySelectorAll(".dashboard-content").forEach(container => {
            if (!container.sortableInstance) {
                container.sortableInstance = new Sortable(container, {
                    group: {
                        name: "shared",
                        pull: true,
                        put: function (to, from, item) {
                            if (to.el.classList.contains("aiCard") || item.classList.contains("aiCard")) {
                                console.log("⚠️ AI row cannot be modified by drag-and-drop.");
                                return false;
                            }
                            return true;
                        }
                    },
                    animation: 300, // Smooth transition when moving items
                    easing: "cubic-bezier(0.25, 1, 0.5, 1)", // Smooth easing effect
                    swapThreshold: 0.5, // Allows smooth shifting rather than instant placement
                    ghostClass: "dragging", // Class added to the ghost element during drag
                    chosenClass: "chosen", // Class added to the chosen item during drag
                    handle: ".normalCard", // Only normalCard is draggable
                    filter: ".aiCard",
                    preventOnFilter: false,

                    onStart: function (evt) {

                        if (evt.item.classList.contains("aiCard")) {
                            console.log("AI card drag prevented.");
                            evt.preventDefault();
                        }
                    },

                    onMove: function (evt) {

                        let target = evt.related;
                        if (target && target.classList.contains("normalCard")) {
                            target.style.transform = "scale(1.05)"; // Slightly enlarge when about to be swapped
                        }
                    },

                    onEnd: function (evt) {
                        let normalCards = evt.to.querySelectorAll(".normalCard").length;


                        if (normalCards > maxCardsPerRow) {
                            const overflowCards = normalCards - maxCardsPerRow;
                            for (let i = 0; i < overflowCards; i++) {
                                const cardToMove = evt.to.querySelector(".normalCard:last-child");
                                moveToNextAvailableRow(cardToMove, evt.to);
                            }
                        }

                        // Reset scaling effect
                        document.querySelectorAll(".normalCard").forEach(card => {
                            card.style.transform = "";
                        });

                        console.log("Card moved:", evt.oldIndex, "->", evt.newIndex, "From:", evt.from, "To:", evt.to);
                    }
                });
            }
        });
    }

    document.getElementById("userPrompt").addEventListener("focus", function () {
        console.log("Input is focused, disabling Sortable temporarily.");
    });

    initSortableForRows();


    const observer = new MutationObserver(() => {
        initSortableForRows();
    });

    if (dashboardContainer) {
        observer.observe(dashboardContainer, { childList: true, subtree: true });
    }
});