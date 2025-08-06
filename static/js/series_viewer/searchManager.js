import * as state from '../state.js';
import { addSeries } from './sidebarManager.js'
import { fetchFredSectors, getModelData } from '../dataFetch.js';

const apiKey = 'd53b20ba9e95bf2db394571e54a11e40'

/**
 * Makes an API call to fetch search results based on the query and search type.
 * @param {string} query The search query string.
 * @param {string} searchType The type of search ('fredSectors' or 'Industry').
 * @returns {Promise<Array<Object>>} A promise that resolves with the search results.
 * @throws {Error} If the API response is not OK or an error occurs during the fetch.
 */
export async function callQuery(query, searchType){
    let results = null;
    if (searchType == 'fredSectors'){
        const fredQueryUrl = `https://${state.server}:8000/search_all_series?query=` + query.replaceAll(' ', '%20'); // REMEMBER TO CHANGE TO SERVER04
        try {
            const response = await fetch(fredQueryUrl);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! Status: ${response.status}, Details: ${errorText}`);
            }

            results = await response.json();
        } catch (error) {
            console.error(error);
            throw error;
        }
    } else if (searchType == 'Industry') {
        const industryQueryUrl = `https://${state.server}:9000/datasets?query=${query}&data_type=1` // This is the search query for models, replace with search query for all series
        try {
            const response = await fetch(industryQueryUrl);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! Status: ${response.status}, Details: ${errorText}`);
            }

            results = await response.json();
        } catch (error) {
            console.error(error);
            throw error;
        }   
    } else {
        const globalFredQueryUrl = `https://${state.server}:8000/global_search?query=` + query.replaceAll(' ', '%20'); // REMEMBER TO CHANGE TO SERVER04
        try {
            const response = await fetch(globalFredQueryUrl);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! Status: ${response.status}, Details: ${errorText}`);
            }

            results = await response.json();
        } catch (error) {
            console.error(error);
            throw error;
        }
    }
    return results;
}

/**
 * Performs a client-side search based on the query and search type.
 * It fetches results, filters them based on selected criteria (sector/model),
 * and then displays them in the search results div.
 * @param {string} query The search query string.
 * @param {string} searchType The type of search ('fredSectors', 'Industry', or 'globalFred').
 * @returns {Promise<void>} A promise that resolves when the search and display are complete.
 */
export async function performClientSideSearch(query, searchType) {
    const searchResultsDiv = document.getElementById('searchResults');
    let allResults = [];
    let filteredResults = []

    searchResultsDiv.style.display = 'block';
    searchResultsDiv.innerHTML = '<div class="text-center p-3">Loading results...</div>';

    try {
        switch (searchType) {
            case 'fredSectors': // Handle fredSectors explicitly
                allResults = await callQuery(query, 'fredSectors'); // Call with fredSectors type
                if (state.currentSelectedSectorId) {
                    filteredResults = allResults.filter(block => {
                        return block.sector_id === state.currentSelectedSectorId;
                    });
                } else {
                    filteredResults = allResults;
                }
                // Apply query filtering to fredSectors
                filteredResults = filteredResults.filter(block => {
                    const idLower = block.series_id ? String(block.series_id).toLowerCase() : '';
                    const nameLower = block.series_description ? block.series_description.toLowerCase() : '';
                    const queryLower = query.toLowerCase();
                    return queryLower === '' || idLower.includes(queryLower) || nameLower.includes(queryLower);
                });
                break; // Break here for fredSectors

            case 'globalFred': 
                filteredResults = await callQuery(query, 'globalFred');
                break; 

            case 'Industry':
                let modelData = [];
                if (state.currentSelectedModelId) {
                    modelData = await getModelData(state.currentSelectedModelId);
                } else {
                    console.warn("No specific Industry Model selected. Search might not return results without a model filter.");
                }

                allResults = modelData.series || []; 
                filteredResults = allResults.filter(block => {
                    let nameLower = block.name ? block.name.toLowerCase() : '';
                    const queryLower = query.toLowerCase();
                    const idLower = block.series_id ? String(block.series_id).toLowerCase() : '';

                    return queryLower === '' || nameLower.includes(queryLower) || idLower.includes(queryLower);
                });
                break;

            // Remove case 'all': as it's no longer a distinct search type in your HTML.
            // The functionality for 'Search All FRED' is now covered by 'globalFred'.
            default:
                console.warn('Unknown searchType:', searchType);
        }
    } catch (error) {
        console.error("Error during client-side search:", error);
        searchResultsDiv.innerHTML = '<div class="text-danger p-3">Error fetching search results. Please try again.</div>';
        return;
    }

    displaySearchResults(filteredResults);
}

/**
 * Displays the given search results in the search results div.
 * Creates clickable list items for each series, allowing them to be added to the chart.
 * @param {Array<Object>} results An array of series objects to display.
 * @returns {void}
 */
export function displaySearchResults(results) {
    const searchResultsDiv = document.getElementById('searchResults');
    searchResultsDiv.innerHTML = '';

    if (results.length === 0) {
        searchResultsDiv.innerHTML = '<p class="list-group-item text-muted">No results found.</p>';
        searchResultsDiv.style.display = 'block';
        return;
    }

    const ul = document.createElement('ul');
    ul.classList.add('list-group');

    results.forEach(series => {
        const li = document.createElement('li');
        const item = document.createElement('a');
        item.href = '#';
        item.classList.add('list-group-item', 'list-group-item-action');

        let displayText = '';

        let rawSeriesId = String(series.series_id).trim(); 
        let seriesIdToPass;

        const numId = Number(rawSeriesId);

        if (!isNaN(numId) && rawSeriesId !== '') {
            seriesIdToPass = numId;
        } else {
            seriesIdToPass = rawSeriesId; 
        }

        // Account for .series_description syntax for FRED json and .name syntax for Industry json
        if (series.series_description) {
            displayText = `${series.series_description} (ID: ${seriesIdToPass})`;
        }
        else if (series.name) {
            displayText = `${series.name} (ID: ${seriesIdToPass})`;
        }
        else {
            displayText = `Unnamed Series (ID: ${seriesIdToPass || 'N/A'})`;
        }

        item.textContent = displayText;

        item.onclick = (e) => {
            e.preventDefault();
            addSeries(seriesIdToPass);
        };

        li.appendChild(item);
        ul.appendChild(li);
    });

    searchResultsDiv.appendChild(ul);
    searchResultsDiv.style.display = 'block';
}

/**
 * Fetches industry models from the server and populates the model selection dropdown.
 * It also updates the `allIndustryModels` state with the fetched data.
 * Uses jQuery AJAX for the fetch operation.
 * @returns {Promise<void>} A promise that resolves when the models have been fetched and dropdown populated.
 */
export async function fetchAndPopulateIndustryModels() {
    const fetchurl = `https://${state.server}:9000/`;
    const url = fetchurl + "_get_industry_models";
    console.log("Attempting to fetch industry models for sidebar dropdown from:", url);

    $.ajax({
        type: "GET",
        url: url,
    })
    .done(function(data, textStatus, jqXHR) {
            console.log("Successfully fetched industry models HTML.");

            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = data;

            const modelSelectionDropdown = $('#modelSelectionDropdown');
            modelSelectionDropdown.empty();

            // Add "All models" item first
            const allModelsItem = document.createElement('li');
            const allModelsLink = document.createElement('a');
            allModelsLink.classList.add('dropdown-item');
            allModelsLink.href = '#';
            allModelsLink.textContent = 'All Industry Models';
            allModelsLink.dataset.modelId = 'all';
            allModelsItem.appendChild(allModelsLink);
            modelSelectionDropdown.append(allModelsItem);

            const newAllIndustryModelsMap = new Map();

            $(tempDiv).children('li').each(function() {
                const $subMenuItem = $(this).clone();

                const $toggleLink = $subMenuItem.find('> .dropdown-toggle');
                if ($toggleLink.length) {
                    $toggleLink.removeAttr('href');
                    $toggleLink.removeAttr('data-link');
                }

                $subMenuItem.find('ul a.dropdown-item').each(function() {
                    const $modelLink = $(this);
                    const modelName = $modelLink.text().trim();
                    const href = $modelLink.attr('href');

                    const match = href ? href.match(/\/model\/series\/(\d+)/) : null;
                    const modelId = match ? match[1] : null;

                    if (modelId && modelName) {
                        newAllIndustryModelsMap.set(modelId, modelName);
                    }

                    $modelLink.removeAttr('href');
                    $modelLink.removeAttr('data-link');
                });

                modelSelectionDropdown.append($subMenuItem);
            });

            newAllIndustryModelsMap.set('all', 'All Models');

            if (typeof state !== 'undefined' && typeof state.setAllIndustryModels === 'function') {
                state.setAllIndustryModels(newAllIndustryModelsMap);
                console.log("Successfully updated state with all industry models.");
            } else {
                console.error("state object or state.setAllIndustryModels function not found or accessible.");
            }

            $('.dropdown-toggle').dropdown();

        })
        .fail(function(jqXHR, textStatus, errorThrown) {
            console.error("Error fetching industry models:", textStatus, errorThrown, jqXHR.responseText);
            $('#error_message').html('Failed to load industry models: ' + jqXHR.status + ' - ' + (jqXHR.responseText || errorThrown));
            $('#error_modal').modal('show');
        });
}

/**
 * Fetches FRED sectors and populates the sector selection dropdown.
 * It updates the `allFredSectors` state and displays the sectors in the dropdown.
 * @returns {Promise<void>} A promise that resolves when the sectors have been fetched and dropdown populated.
 */
export async function populateSectorDropdown() {
    const sectorListElement = document.getElementById('sectorSelectionDropdown');
    if (!sectorListElement) {
        console.warn('Sector selection dropdown not found.');
        return;
    }

    await fetchFredSectors();

    sectorListElement.innerHTML = '';

    // Add "All sectors" item first
    const allSectorsItem = document.createElement('li');
    const allSectorsLink = document.createElement('a');
    allSectorsLink.classList.add('dropdown-item');
    allSectorsLink.href = '#';
    allSectorsLink.textContent = 'All FRED Sectors';
    allSectorsLink.dataset.sectorId = 'all';
    allSectorsItem.appendChild(allSectorsLink);
    sectorListElement.appendChild(allSectorsItem);

    state.allFredSectors.forEach(sector => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.classList.add('dropdown-item');
        a.href = '#';
        a.textContent = sector.name;
        a.dataset.sectorId = sector.id;
        li.appendChild(a);
        sectorListElement.appendChild(li);
    });
}
