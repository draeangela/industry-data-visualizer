import * as state from './state.js'

let industryUrl = `https://${state.server}:9000/`; 
let fredUrl = `https://${state.server}:8000/`; 

$(document).ready(function() {
    console.log("app.js loaded and jQuery is ready!");
    
    /**
     * Fetches industry model names from the server and populates the #industry_model_list with the returned HTML.
     * Handles success by inserting HTML and failure by displaying an error message in a modal.
     */
    function fetchAndPopulateIndustryModels() {
        console.log("Attempting to fetch industry models from:", industryUrl + "_get_industry_models");

        $.ajax({
            type: "GET",
            url: industryUrl + "_get_industry_models",
        })
        .done(function(data, textStatus, jqXHR) {
            console.log("Successfully fetched industry models HTML.");
            $('#industry_model_list').html(data);
        })
        .fail(function(jqXHR, textStatus, errorThrown) {
            console.error("Error fetching industry models:", textStatus, errorThrown, jqXHR.responseText);
            $('#error_message').html('Failed to load industry models: ' + jqXHR.status + ' - ' + (jqXHR.responseText || errorThrown));
            $('#error_modal').modal('show');
        });
    }

    /**
     * Fetches sector model names from the API and populates the FRED sector dropdown.
     * Handles success by calling `populateSectorDropdown` and failure by displaying an error message in a modal.
     */
    function fetchAndPopulateSectorModels() {
        console.log("Attempting to fetch sector models from API:", fredUrl + "sectors");

        $.ajax({
            type: "GET",
            url: fredUrl + "sectors",
            dataType: "json",
        })
        .done(function(data, textStatus, jqXHR) {
            console.log("Successfully fetched sector data:", data);

            let sectorNamesArray = data;
            populateSectorDropdown(sectorNamesArray);
        })
        .fail(function(jqXHR, textStatus, errorThrown) {
            console.error("Error fetching sector models from API:", textStatus, errorThrown, jqXHR.responseText);
            $('#error_message').html('Failed to load sector models from API: ' + jqXHR.status + ' - ' + (jqXHR.responseText || errorThrown));
            $('#error_modal').modal('show');
        });
    }

    /**
     * Populates the FRED sector dropdown selector (#fred_sector_list) with a list of sector names.
     * Each sector name is converted into a dropdown item with a link to a sector-specific page.
     *
     * @param {Array<string>} sectorsArray - An array of strings, where each string is a sector name.
     */
    function populateSectorDropdown(sectorsArray) {
        const dropdownList = $('#fred_sector_list');
        dropdownList.empty();

        if (sectorsArray && sectorsArray.length > 0) {
            sectorsArray.forEach(sectorName => {
                if (sectorName) {
                    // Encode the sectorName for URL safety
                    const encodedSectorName = encodeURIComponent(sectorName.replace(/\s+/g, '_')); // Use underscore for display, then encode
                    // Pass the encoded sector name as a URL parameter
                    const sectorPageUrl = `/static/html/sector_page.html?sector=${encodedSectorName}`; 

                    dropdownList.append(`<li><a class="dropdown-item" href="${sectorPageUrl}" data-link>${sectorName}</a></li>`);
                }
            });
        } else {
            dropdownList.append(`<li><a class="dropdown-item" href="#">No Sectors Found</a></li>`);
        }
    }

    // Call both functions to fetch and populate when the page loads
    fetchAndPopulateIndustryModels();
    fetchAndPopulateSectorModels();

    // Event listener for when a dropdown item is clicked
    $('#industry_model_list, #fred_sector_list').on('click', '.dropdown-item', function(e) {
        if ($(this).attr('data-link') !== undefined) {
            e.preventDefault(); 
            const targetUrl = $(this).attr('href');
            const selectedText = $(this).text();
            console.log(`Navigating to: ${targetUrl} for selected model: ${selectedText}`);

            window.location.href = targetUrl;
        } else {
            console.log("Selected item (no data-link):", $(this).text());
        }

        //const selectedModel = $(this).text();
    });

    // Handle the error modal dismiss button
    $('#modal_dismiss_button').on('click', function() {
        $('#error_modal').modal('hide');
    });

});