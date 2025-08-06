// seriesViewerLogic.js:
import * as state from '../state.js';
import { initializeChart, refreshChart, downloadChartAsImage } from './chartManager.js';
import { getSeriesData } from '../dataFetch.js'
import { initializeSeriesDetailModal } from './popupManager.js'
import { performClientSideSearch } from './searchManager.js';

document.addEventListener('DOMContentLoaded', async function() {
    await initializeSeriesDetailModal();

    // Initialize Chart 
    const chartDom = document.getElementById('industrySeriesChart');
    if (!chartDom) {
        console.error("ECharts container not found: #industrySeriesChart. Chart cannot be initialized.");
        return;
    }

    const chartInstance = echarts.init(chartDom);
    initializeChart(chartInstance);

    // Fetch series ids from URL
    const urlParams = new URLSearchParams(window.location.search);
    const seriesIdsString = urlParams.get('seriesIds'); 

    if (seriesIdsString) {
        state.setSelectedSeriesIds(
            seriesIdsString
                .split(',')
                .map(id => {
                    const trimmedId = id.trim();
                    if (/^\d+$/.test(trimmedId)) {
                        return Number(trimmedId); 
                    }
                    return trimmedId;
                })
                .filter(id => id !== '') 
        );
    } else {
        state.setSelectedSeriesIds([]);
        console.warn("No series IDs found in the URL query parameters.");
    }

    // --- Core State Initialization ---
    // Initialize data for all selected series
    const allSeriesData = []; 
    if (!state.selectedSeriesIds || state.selectedSeriesIds.length === 0) {
        console.warn("No series selected. Chart will not display any data.");
        await refreshChart([]); 
        return; 
    }

    for (const id of state.selectedSeriesIds) {
        state.dataTypeMap.set(id, /^\d+$/.test(id) ? 'Industry' : 'FRED'); 

        try {
            const data = await getSeriesData(id); 
            
            if (data && data.history && data.history.length > 0) {
                const mostRecentForecastDate = data.history[data.history.length - 1].date;
                state.selectedForecastsMap.set(id, [mostRecentForecastDate]); 
            } else {
                state.selectedForecastsMap.set(id, []);
                console.warn(`No history data available for series ID: ${id}. No default forecast set.`);
            }
        } catch (error) {
            console.error(`Error fetching data for series ID ${id}:`, error);
            state.selectedForecastsMap.set(id, []); 
        }
    }

    // Initialize viewTitle based on successfully fetched series data
    if (allSeriesData.length > 0) {
        const firstSeries = allSeriesData[0]; 
        if (state.selectedSeriesIds.length > 1) {
            state.setViewTitle(firstSeries.name + ' & OTHERS')
        } else {
            state.setViewTitle(firstSeries.name)
        }
    } else {
        console.warn('Could not set view title: No valid series data fetched.');
    }

    // Initialize state.isVisible and state.tempIsVisible
    let initialVisibilityMap = new Map();
    state.selectedSeriesIds.forEach((id) => {
        initialVisibilityMap.set(id, true)
    })
    state.setIsVisible(initialVisibilityMap);
    state.setTempIsVisible(new Map(initialVisibilityMap));
    
    const chartTitleInput = document.getElementById('chartTitleInput'); 

    // Initial chart refresh after all data is loaded and state is set
    await refreshChart(state.selectedSeriesIds); 

    // --- Apply Changes Event Listener ---
    const applyChangesBtn = document.getElementById('applyChangesbtn');

    if (applyChangesBtn) {
        applyChangesBtn.addEventListener('click', function() {
            state.setIsVisible(new Map(state.tempIsVisible));

            if (chartTitleInput) { 
                state.setViewTitle(chartTitleInput.value);
            } else {
                state.setViewTitle('Untitled View'); 
            }
            
            console.log("Selected Forecasts Map before Refresh:", state.selectedForecastsMap);
            console.log ("Refreshing Chart now...");
            refreshChart(state.selectedSeriesIds);
            console.log("Selected Forecasts Map after Refresh:", state.selectedForecastsMap);

            const offcanvas = bootstrap.Offcanvas.getInstance(document.getElementById('offcanvasSidebar'));
            if (offcanvas) {
                offcanvas.hide(); 
            }
        });
    }

    // --- Search Management ---
    /**
     * Updates the visibility of the model and sector dropdowns based on the current search type.
     * @param {string} currentSearchType The current search type ('Industry', 'FRED', or other).
     * @returns {void}
     */
    function updateSearchDropdownVisibility(currentSearchType) {
        const modelDropdownContainer = document.getElementById('modelDropdownContainer');
        const sectorDropdownContainer = document.getElementById('sectorDropdownContainer');

        if (currentSearchType === 'Industry') {
            modelDropdownContainer.style.display = 'block';
            sectorDropdownContainer.style.display = 'none';
        } else if (currentSearchType === 'fredSectors') { // Matches 'Search FRED Sectors'
            modelDropdownContainer.style.display = 'none';
            sectorDropdownContainer.style.display = 'block';
        } else if (currentSearchType === 'globalFred') { // Matches 'Search All FRED'
            modelDropdownContainer.style.display = 'none';
            sectorDropdownContainer.style.display = 'none'; // No dropdown for 'Search All FRED'
        } else {
            // Default case, e.g., if initial state is something else or an unrecognized type
            modelDropdownContainer.style.display = 'none';
            sectorDropdownContainer.style.display = 'none';
            console.warn('Unknown search type received:', currentSearchType);
        }
    }

    const seriesSearchInput = document.getElementById('seriesSearchInput');
    if (seriesSearchInput) {
        seriesSearchInput.addEventListener('input', function() {
            clearTimeout(state.searchTimeout);
            const query = this.value;
            state.setSearchTimeout(setTimeout(() => { 
                performClientSideSearch(query, state.currentSearchType); // This now uses the correct searchType
            }, 300)); 
        });
    }

    document.querySelectorAll('#searchTypeDropdown + .dropdown-menu .dropdown-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const newSearchType = this.dataset.searchType; 
            state.setCurrentSearchType(newSearchType); // Set the new search type in state
            document.getElementById('searchTypeDropdown').textContent = this.textContent; // Update button text

            // Update dropdown visibility based on the new search type
            updateSearchDropdownVisibility(newSearchType);
            const query = seriesSearchInput.value;
            performClientSideSearch(query, state.currentSearchType); // Trigger search with updated type
        });
    });

    // Initialize visibility on page load based on initial state.currentSearchType
    // You might want to set an initial default in your state.js or here.
    // For example, if 'globalFred' is the default:

    state.setCurrentSearchType(state.currentSearchType || 'globalFred'); // Set a default if not already set
    updateSearchDropdownVisibility(state.currentSearchType);
    // --- Sidebar Event Listeners ---
    // Sector selection dropdown
    const sectorSelectionDropdown = document.getElementById('sectorSelectionDropdown');
    if (sectorSelectionDropdown) {
        sectorSelectionDropdown.addEventListener('click', function(e) {
            const target = e.target;
            if (target.classList.contains('dropdown-item') && target.dataset.sectorId) {
                e.preventDefault();
                state.setCurrentSelectedSectorId(target.dataset.sectorId === 'all' ? null : target.dataset.sectorId);
                document.getElementById('sectorSelectionButton').textContent = target.textContent;

                const query = seriesSearchInput.value;
                performClientSideSearch(query, state.currentSearchType); 
            }
        });
    }

    // Model selection dropdown
    const modelSelectionDropdown = document.getElementById('modelSelectionDropdown');
    if (modelSelectionDropdown) {
        modelSelectionDropdown.addEventListener('click', function(e) {
            const target = e.target;
            if (target.classList.contains('dropdown-item')) {
                e.preventDefault(); 

                let targetId = 0;
                for (const [id, name] of state.allIndustryModels.entries()) {
                    if (name === target.textContent) {
                        targetId = id
                    }
                }
                state.setCurrentSelectedModelId(target.dataset.modelId === 'all' ? null : targetId);
                
                // Update the text of the button that triggers the dropdown
                const modelSelectionButton = document.getElementById('modelSelectionButton');
                if (modelSelectionButton) {
                    modelSelectionButton.textContent = target.textContent;
                } else {
                    console.warn("Element with ID 'modelSelectionButton' not found.");
                }

                // Uncomment and adjust if you need to perform a search or chart refresh here
                const seriesSearchInput = document.getElementById('seriesSearchInput');
                performClientSideSearch(seriesSearchInput.value, state.currentSearchType); 
            }
        });
    }

    // History only button
    const historyOnlyBtn = document.getElementById('historyOnlyBtn');
    if (historyOnlyBtn) {
        historyOnlyBtn.addEventListener('click', function() {
            state.setPlotMode('H')
            refreshChart(state.selectedSeriesIds)
            console.log("History only button clicked")
        })
    }

    // Forecast only button
    const forecastOnlyBtn = document.getElementById('forecastOnlyBtn');
    if (forecastOnlyBtn) {
        forecastOnlyBtn.addEventListener('click', function() {
            state.setPlotMode('F')
            refreshChart(state.selectedSeriesIds)
            console.log('Forecast only button clicked')
        })
    }

    // Plot all button
    const plotAllBtn = document.getElementById('plotAllBtn');
    if (plotAllBtn) {
        plotAllBtn.addEventListener('click', function() {
            state.setPlotMode('A')
            refreshChart(state.selectedSeriesIds)
            console.log('Plot all button clicked')
        })
    }

    // Chart type button
    const toggleChartTypeBtn = document.getElementById('toggleChartTypeBtn');
    if (toggleChartTypeBtn) {
        toggleChartTypeBtn.textContent = `${state.getChartType()}`;

        toggleChartTypeBtn.addEventListener('click', function() {
            let newChartType;
            if (state.getChartType() === 'Line') {
                newChartType = 'Bar';
            } else {
                newChartType = 'Line';
            }
            state.setChartType(newChartType); 
            toggleChartTypeBtn.textContent = `${newChartType}`; 
            refreshChart(state.selectedSeriesIds);
            console.log(`Chart type switched to: ${newChartType}`);
        });
    }

    // Download chart button
    const downloadChartBtn = document.getElementById('downloadImageOption');
    if (downloadChartBtn) {
        downloadChartBtn.addEventListener('click', downloadChartAsImage);
    }    

});