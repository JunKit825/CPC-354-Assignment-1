// Function to toggle the current animation selection
function toggleDropdown() {
    document.getElementById("options").classList.toggle("show");
}

// Make sure that the selection close when click on other place
window.onclick = function(event) {

    // If the area outside of the checkbox is clicked, hide the checkbox
    if (!event.target.matches('.dropdown button') && !event.target.closest('.dropdown-content')) {
        let dropdowns = document.getElementsByClassName("dropdown-content");
        for (let i = 0; i < dropdowns.length; i++) {
            let openDropdown = dropdowns[i];
            if (openDropdown.classList.contains('show')) {
                openDropdown.classList.remove('show');
            }
        }
    }

    // If the clicked area is not the pre-set transition set, cancel the selection
    if (!event.target.classList.contains('transition-choice')&& !event.target.closest('.preset-transition')) {
        document.querySelectorAll('.transition-choice').forEach(t => t.classList.remove('selected'));
        selectedTextarea = null; // Reset selected textarea
    }
}

// From Dropdown botton choose the transition for preset transition
document.querySelector('.transition-list').addEventListener('change', function(event) {
    if (event.target.matches('input[type="checkbox"]')) {
        const text = event.target.value;
        
        // Find the parent preset-transition block
        const parentBox = event.target.closest('.preset-transition');

        // Find the specific transition-choice div inside that block
        const selectedItems = parentBox.querySelector('.transition-choice');
        const existingItem = selectedItems.querySelector(`[data-value="${text}"]`);

        // If the box is checked
        if (event.target.checked) { 
            if (!existingItem) { // and item doesn't exist, add it
                const selectedItem = document.createElement('div'); // Create a new <div> for the checked item
                selectedItem.setAttribute('data-value', text); // Add attribute for easy tracking
                selectedItem.innerText = text; // Set the text 
                selectedItems.appendChild(selectedItem); // Add the selected item to the selected-items container
            }
        } else { // If the box is unchecked
            if (existingItem) { // and item exists, remove it
                existingItem.remove();
            }
        }
    }
});



let selectedTextarea = null; // Store the selected textarea

// Select which preset transition when click
document.querySelector('.transition-list').addEventListener('click', function(event) {
    // outer wrapper to detect clicks
    let wrapper = event.target.closest('.preset-transition');

    if (wrapper) {
        // Remove selected from all inner boxes
        document.querySelectorAll('.transition-choice').forEach(div => div.classList.remove('selected'));

        // Add selected to the inner transition-choice
        let chosen = wrapper.querySelector('.transition-choice');
        chosen.classList.add('selected');
        selectedTextarea = chosen;
    }
});

// When button is clicked, fetch value to the current run animation (queue)
// The DOMContentLoaded is added to make sure that this function is run when all of the HTML content is loaded.This make sure that the selected-op is not null and the event listener does not fail
document.addEventListener('DOMContentLoaded', function() {
    let button = document.getElementById("selected-transition");

    // When the pre-set animation is chosen and want to apply that transition
    button.addEventListener('click', function() {
        if (selectedTextarea) {
            let text = selectedTextarea;
            let selectedItems = document.getElementById("selected-op")
            selectedItems.innerHTML = selectedTextarea.innerHTML;

            // Reset and recompute when new transition is selected
            resetValue(); 
            recompute();
        } else {
            alert("Please select a preset transition first!");
        }
        
        // Below part make sure that the selection in the checkbox is in sync with the selected animation
        const checkedBoxes = document.querySelectorAll('.dropdown-content input[type="checkbox"]');
        const selectedItems = document.querySelectorAll('.selected-items > div');

        // Get an array of values in selected-items
        const selectedValues = Array.from(selectedItems).map(div => div.dataset.value);

        // Loop through all checkboxes
        checkedBoxes.forEach(box => {
            if (selectedValues.includes(box.value)) {
                box.checked = true;   // Keep checked if value is in selected-items
            } else {
                box.checked = false;  // Otherwise, uncheck
            }
        });
    });
});

// Add task to the pre-set transition set
function addTask() {
    let labelValues = ["Right Rotation", "Left Rotation", "Zoom in", "Zoom out", "Bouncing top right", "Bouncing bottom left", "Bouncing top left", "Bouncing bottom right"];
    let trueLabel = ["RotationR", "RotationL", "ZoomIn", "ZoomOut", "BouncingTR", "BouncingBL", "BouncingTL", "BouncingBR"];
    let taskList = document.getElementsByClassName("transition-list")[0];

    let divBox = document.createElement("div");
    divBox.className = "preset-transition";

    let chosenBox = document.createElement("div");
    chosenBox.className = "transition-choice";

    // Hide/Show button
    let hide_show = document.createElement("span");
    hide_show.className = "hide-show-text";
    hide_show.textContent = "Hide";
    hide_show.style.userSelect = "none";

    // Delete button
    let deleteBtn = document.createElement("span");
    deleteBtn.className = "delete-text";
    deleteBtn.textContent = "Delete";
    deleteBtn.style.userSelect = "none";
    deleteBtn.style.marginLeft = "20px";
    deleteBtn.style.color = "red";

    // Create checkboxes container
    let choice = document.createElement("div");
    choice.className = "addTask-button";

    // Create checkbox, according to the labelValues[] array
    for (let i = 0; i < labelValues.length; i++) {
        let label = document.createElement("label");
        let input = document.createElement("input");
        input.type = "checkbox";
        input.value = trueLabel[i];
        label.appendChild(input);
        label.appendChild(document.createTextNode(labelValues[i]));
        choice.appendChild(label);
    }

    let headerRow = document.createElement("div");
    headerRow.style.display = "flex";
    headerRow.style.justifyContent = "space-between";
    headerRow.style.alignItems = "center";

    headerRow.className = "preset-transition-header";

    // Append elements
    divBox.appendChild(chosenBox);
    divBox.appendChild(headerRow);

    headerRow.appendChild(hide_show);
    headerRow.appendChild(deleteBtn);
    divBox.appendChild(choice);
    taskList.appendChild(divBox);
}

// Toggle visibility of checkboxes when clicked (hide or show the checkbox in the pre-set transition)
document.addEventListener("click", function (event) {
    if (event.target.classList.contains("hide-show-text")) {

        let divBox = event.target.closest(".preset-transition");
        let choice = divBox.querySelector(".addTask-button");
        let hide_show = event.target;

        if (choice.style.display === "none") {
            choice.style.display = "block";
            hide_show.textContent = "Hide";
        } else {
            choice.style.display = "none";
            hide_show.textContent = "Show";
        }
    }

    // Delete the preset transition box when click the delete text
    if (event.target.classList.contains("delete-text")) {
        let divBox = event.target.closest(".preset-transition");
        divBox.remove();
    }
});