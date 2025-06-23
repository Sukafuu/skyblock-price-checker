function toTitleCase(str) {
    return str
        .toLowerCase()
        .split(" ")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

async function fetchLowestPrice(itemName) {
    const baseUrl = `https://api.hypixel.net/skyblock/auctions`;

    try {
        const firstPageResponse = await fetch(`${baseUrl}?page=0`);
        const firstPageData = await firstPageResponse.json();

        if (!firstPageData.success) {
            throw new Error("Failed to fetch auction data");
        }

        const totalPages = firstPageData.totalPages;
        const fetchPromises = [];
        for (let page = 0; page < totalPages; page++) {
            fetchPromises.push(fetch(`${baseUrl}?page=${page}`).then(res => res.json()));
        }

        const allPagesData = await Promise.all(fetchPromises);
        const allAuctions = allPagesData.flatMap(data => data.auctions);

        const filteredAuctions = allAuctions.filter(auction =>
            auction.item_name.toLowerCase() === itemName.toLowerCase() && auction.bin
        );

        if (filteredAuctions.length === 0) {
            return `No auctions found for item: ${itemName}`;
        }

        const lowestPrice = Math.min(...filteredAuctions.map(auction => auction.starting_bid));
        return `Lowest price for ${itemName}: ${lowestPrice.toLocaleString()}`;
    } catch (error) {
        console.error("Error fetching auction data:", error);
        return "An error occurred while fetching the auction data.";
    }
}

async function fetchLowestBazaarPrice(itemName) {
    const apiKey = "c39af882-f450-4452-9106-fd3edb234e91";
    const productsUrl = `https://api.hypixel.net/skyblock/bazaar?key=${apiKey}`;

    try {
        // Fetch the Bazaar data
        const response = await fetch(productsUrl);
        const data = await response.json();

        if (!data.success) {
            throw new Error("Failed to fetch Bazaar data");
        }

        // Normalize the item name: convert to uppercase and replace spaces with underscores
        const productKey = itemName.toUpperCase().trim().replace(/ /g, "_");
        const product = data.products[productKey];

        if (!product) {
            return `No Bazaar data found for item: ${itemName}`;
        }

        // Retrieve the sellPrice from quick_status
        const sellPrice = product.quick_status.sellPrice;
        if (sellPrice <= 0) {
            return `No valid sell price found for item: ${itemName}`;
        }

        const formattedPrice = sellPrice.toLocaleString(); // Add comma separators
        return `Lowest Bazaar price for ${itemName}: ${formattedPrice}`;
    } catch (error) {
        console.error("Error fetching Bazaar data:", error);
        return "An error occurred while fetching the Bazaar data.";
    }
}

let bazaarSuggestions = []; // Store all Bazaar product keys for suggestions

async function fetchBazaarSuggestions() {
    const apiKey = "c39af882-f450-4452-9106-fd3edb234e91";
    const productsUrl = `https://api.hypixel.net/skyblock/bazaar?key=${apiKey}`;

    try {
        const response = await fetch(productsUrl);
        const data = await response.json();

        if (!data.success) {
            throw new Error("Failed to fetch Bazaar data");
        }

        // Store all product keys for suggestions in title case
        bazaarSuggestions = Object.keys(data.products).map(key => toTitleCase(key.replace(/_/g, " ")));
    } catch (error) {
        console.error("Error fetching Bazaar suggestions:", error);
    }
}

function getFilteredBazaarSuggestions(input) {
    return bazaarSuggestions.filter(item => item.toLowerCase().includes(input.toLowerCase()));
}

document.addEventListener("DOMContentLoaded", async () => {
    const inputField = document.getElementById("itemInput");
    const fetchButton = document.getElementById("fetchButton");
    const resultDisplay = document.getElementById("result");
    const bazaarInputField = document.getElementById("bazaarItemInput");
    const bazaarFetchButton = document.getElementById("bazaarFetchButton");
    const bazaarResultDisplay = document.getElementById("bazaarResult");
    const suggestionBox = document.createElement("div");
    suggestionBox.id = "bazaarSuggestionBox";
    suggestionBox.style.position = "absolute";
    suggestionBox.style.backgroundColor = "#2c2c3e";
    suggestionBox.style.color = "#ffffff";
    suggestionBox.style.border = "1px solid #444455";
    suggestionBox.style.borderRadius = "5px";
    suggestionBox.style.padding = "5px";
    suggestionBox.style.display = "none";
    document.body.appendChild(suggestionBox);

    const binSuggestionBox = document.createElement("div");
    binSuggestionBox.id = "binSuggestionBox";
    binSuggestionBox.style.position = "absolute";
    binSuggestionBox.style.backgroundColor = "#2c2c3e";
    binSuggestionBox.style.color = "#ffffff";
    binSuggestionBox.style.border = "1px solid #444455";
    binSuggestionBox.style.borderRadius = "5px";
    binSuggestionBox.style.padding = "5px";
    binSuggestionBox.style.display = "none";
    document.body.appendChild(binSuggestionBox);

    console.log("DOM fully loaded");

    await fetchBazaarSuggestions(); // Fetch suggestions on page load

    const fetchPrice = async () => {
        const itemName = inputField.value.trim();
        if (!itemName) {
            resultDisplay.textContent = "Please enter an item name.";
            return;
        }

        resultDisplay.textContent = "Fetching...";
        console.log("Fetching BIN price for:", itemName);
        const result = await fetchLowestPrice(itemName);
        resultDisplay.textContent = result;
    };

    fetchButton?.addEventListener("click", fetchPrice);

    inputField?.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            fetchPrice();
        }
    });

    inputField?.addEventListener("input", () => {
        const input = inputField.value.trim();
        if (input) {
            const suggestions = getFilteredBazaarSuggestions(input); // Reuse Bazaar suggestions
            binSuggestionBox.innerHTML = suggestions
                .map(suggestion => `<div class="suggestion">${suggestion}</div>`)
                .join("");
            binSuggestionBox.style.display = "block";
            binSuggestionBox.style.left = `${inputField.getBoundingClientRect().left}px`;
            binSuggestionBox.style.top = `${inputField.getBoundingClientRect().bottom + window.scrollY}px`;
            binSuggestionBox.style.width = `${inputField.offsetWidth}px`;
        } else {
            binSuggestionBox.style.display = "none";
        }
    });

    // Handle suggestion click for BIN checker
    binSuggestionBox.addEventListener("click", (event) => {
        if (event.target.classList.contains("suggestion")) {
            inputField.value = event.target.textContent;
            binSuggestionBox.style.display = "none";
        }
    });

    // Hide BIN suggestions when clicking outside
    document.addEventListener("click", (event) => {
        if (!binSuggestionBox.contains(event.target) && event.target !== inputField) {
            binSuggestionBox.style.display = "none";
        }
    });

    const fetchBazaarPrice = async () => {
        const itemName = bazaarInputField.value.trim();
        if (!itemName) {
            bazaarResultDisplay.textContent = "Please enter an item name.";
            return;
        }

        bazaarResultDisplay.textContent = "Fetching...";
        console.log("Fetching Bazaar price for:", itemName);
        try {
            const result = await fetchLowestBazaarPrice(itemName);
            bazaarResultDisplay.textContent = result;
        } catch (error) {
            console.error("Error in fetchBazaarPrice:", error);
            bazaarResultDisplay.textContent = "An error occurred while fetching the Bazaar data.";
        }
    };

    bazaarFetchButton?.addEventListener("click", fetchBazaarPrice);

    bazaarInputField?.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            fetchBazaarPrice();
            suggestionBox.style.display = "none";
        }
    });

    // Show suggestions as user types
    bazaarInputField?.addEventListener("input", () => {
        const input = bazaarInputField.value.trim();
        if (input) {
            const suggestions = getFilteredBazaarSuggestions(input);
            suggestionBox.innerHTML = suggestions
                .map(suggestion => `<div class="suggestion">${suggestion}</div>`)
                .join("");
            suggestionBox.style.display = "block";
            suggestionBox.style.left = `${bazaarInputField.getBoundingClientRect().left}px`;
            suggestionBox.style.top = `${bazaarInputField.getBoundingClientRect().bottom + window.scrollY}px`;
            suggestionBox.style.width = `${bazaarInputField.offsetWidth}px`;
        } else {
            suggestionBox.style.display = "none";
        }
    });

    // Handle suggestion click
    suggestionBox.addEventListener("click", (event) => {
        if (event.target.classList.contains("suggestion")) {
            bazaarInputField.value = event.target.textContent;
            suggestionBox.style.display = "none";
        }
    });

    // Hide suggestions when clicking outside
    document.addEventListener("click", (event) => {
        if (!suggestionBox.contains(event.target) && event.target !== bazaarInputField) {
            suggestionBox.style.display = "none";
        }
    });
});