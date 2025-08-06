import * as state from '../state.js';
import { getSeriesData } from '../dataFetch.js';
import { showSeriesDetailPopup } from './popupManager.js';
import {fetchAndPopulateIndustryModels, populateSectorDropdown } from './searchManager.js';
let sidebarSeriesCache = new Map(); 

/**
 * Updates the display of the series list in the sidebar.
 * It fetches series data if not cached, then renders each series with options
 * to view details, toggle visibility, and delete.
 * @param {Map<string, boolean>} visibilityMap A map where keys are series IDs and values are booleans indicating visibility.
 * @returns {Promise<void>} A promise that resolves when the sidebar display has been updated.
 */
export async function updateSidebarDisplay(visibilityMap) {
    const currentSeriesListContainer = document.getElementById('currentSeriesListContainer');
    const chartTitleInput = document.getElementById('chartTitleInput');
    chartTitleInput.value = state.viewTitle;

    if (currentSeriesListContainer) {
        currentSeriesListContainer.innerHTML = '';
    } else {
        console.warn("currentSeriesListContainer not found.");
        return;
    }

    const ul = document.createElement('ul');
    ul.classList.add('list-group', 'list-group-flush');
    ul.style.maxHeight = '200px';
    ul.style.overflowY = 'auto';

    const seriesDataToRender = [];
    for (const id of state.selectedSeriesIds) {
        if (!sidebarSeriesCache.has(id)) {
            try {
                const tempChartData = await getSeriesData(id);
                sidebarSeriesCache.set(id, tempChartData);
                seriesDataToRender.push(tempChartData);
            } catch (error) {
                console.error(`Error fetching data for sidebar display for series ID ${id}:`, error);
                seriesDataToRender.push({ series_id: id, name: `Error loading series ${id}` }); // Ensure series_id matches
            }
        } else {
            seriesDataToRender.push(sidebarSeriesCache.get(id));
        }
    }

    if (seriesDataToRender.length > 0) {
        seriesDataToRender.forEach(seriesData => {
            const li = document.createElement('li');
            li.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-center');
            li.setAttribute('data-series-id', seriesData.series_id);

            const span = document.createElement('span');
            span.textContent = seriesData.name;
            li.appendChild(span);

            const iconContainer = document.createElement('div');
            iconContainer.classList.add('d-flex', 'align-items-center');

            const detailsIcon = document.createElement('i');
            detailsIcon.classList.add('bi', 'bi-three-dots', 'me-2');
            detailsIcon.style.cursor = 'pointer';
            detailsIcon.setAttribute('title', 'View Series Details & Edit');
            detailsIcon.onclick = () => showSeriesDetailPopup (
                seriesData.series_id, 
            )
            iconContainer.appendChild(detailsIcon);

            const hideIcon = document.createElement('i');
            hideIcon.classList.add('bi', visibilityMap.get(seriesData.series_id) === false ? 'bi-eye-slash-fill' : 'bi-eye-fill', 'me-2');
            hideIcon.style.cursor = 'pointer';
            hideIcon.setAttribute('title', 'Hide/Show Series');
            hideIcon.onclick = () => toggleSeriesVisibility(seriesData.series_id);
            iconContainer.appendChild(hideIcon);

            const deleteIcon = document.createElement('i');
            deleteIcon.classList.add('bi', 'bi-trash');
            deleteIcon.style.cursor = 'pointer';
            deleteIcon.setAttribute('title', `Remove ${seriesData.name}`);
            deleteIcon.onclick = () => deleteSeries(seriesData.series_id);
            iconContainer.appendChild(deleteIcon);

            li.appendChild(iconContainer);
            ul.appendChild(li);
        });
        currentSeriesListContainer.appendChild(ul);
    } else {
        currentSeriesListContainer.innerHTML = '<p class="text-muted text-center">No series selected to display.</p>';
    }

    let forecastControlDiv = document.getElementById('forecastControlDiv');
    if (forecastControlDiv) {
        forecastControlDiv.remove();
    }
}

/**
 * Toggles the visibility of a specific series on the chart.
 * Updates the `tempIsVisible` state and then refreshes the sidebar display.
 * @param {string} seriesId The ID of the series to toggle.
 * @returns {void}
 */
export function toggleSeriesVisibility(seriesId) {
    console.log(`Toggling visibility for: ${seriesId}`);
    const currentVisibility = state.tempIsVisible.get(seriesId);
    const newVisibility = !currentVisibility;

    const newTempIsVisibleMap = new Map(state.tempIsVisible);
    newTempIsVisibleMap.set(seriesId, newVisibility);
    state.setTempIsVisible(newTempIsVisibleMap);

    updateSidebarDisplay(state.tempIsVisible);
}

/**
 * Deletes a series from the selected series list and its visibility state.
 * Updates the `selectedSeriesIds` and `tempIsVisible` states, then refreshes the sidebar display.
 * @param {string} seriesId The ID of the series to delete.
 * @returns {void}
 */
export function deleteSeries(seriesId) {
    console.log(`Attempting to delete series: ${seriesId}`);

    // Create new arrays/maps and use the setter functions from state.js
    const newTempSelectedSeriesIds = state.selectedSeriesIds.filter(id => id !== seriesId); // Use state.selectedSeriesIds directly here
    state.setSelectedSeriesIds(newTempSelectedSeriesIds); // Use the setter function

    const newTempIsVisibleMap = new Map(state.tempIsVisible);
    newTempIsVisibleMap.delete(seriesId);
    state.setTempIsVisible(newTempIsVisibleMap);
    updateSidebarDisplay(state.tempIsVisible);
}

/**
 * Adds a new series to the temporary selected series list if it's not already present.
 * Determines if the series is 'Industry' or 'FRED' based on its ID.
 * Updates `tempSelectedSeriesIds`, `dataTypeMap`, and `tempIsVisible` states,
 * then refreshes the sidebar display and clears the search input.
 * @param {string|number} seriesId The ID of the series to add.
 * @returns {void}
 */
export function addSeries(seriesId) {
    console.log ("state.tempSelectedSeriesIds (before check):", state.tempSelectedSeriesIds);

    let seriesType;
    const trimmedSeriesId = String(seriesId).trim(); // Ensure it's a trimmed string for reliable parsing

    const numId = Number(trimmedSeriesId);

    if (!isNaN(numId) && trimmedSeriesId !== '') {
        seriesType = "Industry";
    } else {
        seriesType = "FRED";
    }

    if (!state.tempSelectedSeriesIds.includes(seriesId)) { 
        state.selectedSeriesIds.push(seriesId);
        const newTempSelectedSeriesIds = state.selectedSeriesIds;
        state.setTempSelectedSeriesIds(newTempSelectedSeriesIds);

        const newDataTypeMap = new Map(state.dataTypeMap);
        newDataTypeMap.set(seriesId, seriesType); 
        state.setDataTypeMap(newDataTypeMap);

        const newTempIsVisibleMap = new Map(state.tempIsVisible);
        newTempIsVisibleMap.set(seriesId, true);
        state.setTempIsVisible(newTempIsVisibleMap);

        updateSidebarDisplay(state.tempIsVisible);
        console.log(`Series ${seriesId} (${seriesType}) added to temporary state.`);

    } else {
        console.log(`Series ${seriesId} is already in the temporary sidebar list.`);
    }

    //document.getElementById('searchResults').style.display = 'none';
    document.getElementById('seriesSearchInput').value = '';
}

// --- Event Listeners for Sidebar ---
document.addEventListener('DOMContentLoaded', function() {
    const offcanvasSidebar = document.getElementById('offcanvasSidebar');
    if (offcanvasSidebar) {
        offcanvasSidebar.addEventListener('show.bs.offcanvas', function () {
            state.setTempIsVisible(new Map(state.isVisible));
            updateSidebarDisplay(state.tempIsVisible);
            fetchAndPopulateIndustryModels();
            populateSectorDropdown();
        });
    }

    // Apply changes button
    const chartTitleInput = document.getElementById('chartTitleInput'); // Get reference here
    document.getElementById('applyChangesbtn').addEventListener('click', function() {
        state.setIsVisible(new Map(state.tempIsVisible));

        if (chartTitleInput) {
            state.setViewTitle(chartTitleInput.value);
        } else {
            state.setViewTitle('Untitled View');
        }
        const offcanvas = bootstrap.Offcanvas.getInstance(document.getElementById('offcanvasSidebar'));
        if (offcanvas) {
            offcanvas.hide();
        }
        console.log (state.selectedForecastsMap);
    });

    // Download chart button
    document.getElementById('downloadChartBtn').addEventListener('click', function() {
        const myChartInstance = window.myChart;

        if (myChartInstance) {
            const imageUrl = myChartInstance.getDataURL({
                pixelRatio: 2,
                backgroundColor: '#fff'
            });
            const a = document.createElement('a');
            a.href = imageUrl;
            a.download = 'industry_chart.png';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } else {
            console.warn("Chart not initialized for download. Please ensure data is loaded and chart is rendered.");
        }
    });
});