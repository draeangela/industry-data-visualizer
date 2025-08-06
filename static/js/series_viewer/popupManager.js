// industryPopupManager.js
import * as state from '../state.js';
import { getSeriesData } from '../dataFetch.js';
import { getForecastValues } from './chartManager.js';

let seriesDetailModal;
let modalChartInstance = null;
let tempFcDates = []; 
let currentSeriesData = null;

// Define a palette of distinct colors for multiple forecasts
const forecastColorPalette = [
    '#ff7f0e', // Orange 
    '#2ca02c', // Green
    '#d62728', // Red
    '#9467bd', // Purple
    '#8c564b', // Brown
    '#e377c2', // Pink
    '#7f7f7f', // Gray
    '#bcbd22', // Olive
    '#17becf'  // Cyan
];

/**
 * Initializes the series detail modal by fetching its HTML, appending it to the body,
 * and setting up event listeners for modal display and chart resizing.
 */
export async function initializeSeriesDetailModal() {
    try {
        const response = await fetch('../html/series_details_popup.html');
        if (!response.ok) {
            console.error('Failed to load series_details_popup.html:', response.statusText);
            return;
        }
        const modalHtml = await response.text();

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = modalHtml;
        const modalElement = tempDiv.querySelector('#seriesDetailModal');

        if (modalElement) {
            document.body.appendChild(modalElement);
            seriesDetailModal = new bootstrap.Modal(modalElement);
            console.log('Series detail modal initialized.');

            modalElement.addEventListener('shown.bs.modal', () => {
                if (modalChartInstance) {
                    modalChartInstance.resize();
                }
            });
            modalElement.addEventListener('hidden.bs.modal', () => {
                if (modalChartInstance) {
                    modalChartInstance.dispose();
                    modalChartInstance = null;
                }
            });

            // Save button logic
            const saveButton = modalElement.querySelector('#saveChangesButton');
            if (saveButton) {
                saveButton.addEventListener('click', () => {
                    if (currentSeriesData && currentSeriesData.series_id) {
                        const seriesIdToUpdate = currentSeriesData.series_id;
                        if (state.dataTypeMap.get(seriesIdToUpdate) === 'Industry') {
                            state.selectedForecastsMap.set(seriesIdToUpdate, [...tempFcDates]);
                            console.log(`Saved selected forecasts for ${seriesIdToUpdate}:`, state.selectedForecastsMap.get(seriesIdToUpdate));
                        } else {
                            console.log(`No forecasts to save for FRED series ${seriesIdToUpdate}.`);
                        }
                    } else {
                        console.warn('No series data available to save forecasts for.');
                    }
                });
            } else {
                console.error('Save Changes button not found in modal HTML.');
            }

        } else {
            console.error('Modal element with ID "seriesDetailModal" not found in series_details_popup.html.');
        }
    } catch (error) {
        console.error('Error initializing series detail modal:', error);
    }
}

/**
 * Displays the series detail popup for a given series ID, fetching its data
 * and populating the modal content, including historical and forecast data.
 * @param {string} seriesId - The ID of the series to display.
 */
export async function showSeriesDetailPopup(seriesId) {
    if (!seriesDetailModal) {
        console.warn('Series detail modal not initialized. Attempting to initialize now...');
        await initializeSeriesDetailModal();
        if (!seriesDetailModal) {
            console.error('Failed to initialize series detail modal, cannot show.');
            return;
        }
    }

    const seriesData = await getSeriesData(seriesId);
    currentSeriesData = seriesData; // Store fetched data
    if (!seriesData) {
        console.error(`Could not retrieve data for series ID: ${seriesId}. Cannot display modal.`);
        return;
    }

    const modalSeriesId = document.getElementById('modalSeriesId');
    const modalFrequency = document.getElementById('modalFrequency');
    const industryDetailsSection = document.getElementById('industryDetailsSection');
    const forecastsSection = document.getElementById('forecastsSection');
    const forecastsList = document.getElementById('forecastsList');
    const saveChangesButton = document.getElementById('saveChangesButton');

    modalSeriesId.textContent = seriesId;
    modalFrequency.textContent = seriesData.frequency || 'N/A'; 

    // Determine if it's an Industry or FRED series
    const isIndustrySeries = state.dataTypeMap.get(seriesId) === 'Industry';

    // Toggle visibility of Industry-specific details and Forecasts section
    industryDetailsSection.style.display = isIndustrySeries ? '' : 'none';
    forecastsSection.style.display = isIndustrySeries ? '' : 'none';
    saveChangesButton.style.display = isIndustrySeries ? '' : 'none'; // Only show save for Industry forecasts

    if (isIndustrySeries) {
        document.getElementById('modalBlockName').textContent = seriesData.block_name || 'N/A';
        document.getElementById('modalLastChecked').textContent = seriesData.last_checked || 'N/A';
        document.getElementById('modalLastRecorded').textContent = seriesData.last_recorded || 'N/A';
        document.getElementById('modalLastUpdated').textContent = seriesData.last_updated || 'N/A';

        // Populate forecasts for Industry series
        forecastsList.innerHTML = ''; // Clear previous entries
        if (seriesData.history && seriesData.history.length > 0) {
            // Get current selections from state, ensure it's an array for robustness
            tempFcDates = Array.isArray(state.selectedForecastsMap.get(seriesId)) 
                          ? [...state.selectedForecastsMap.get(seriesId)] 
                          : [];

            // If tempFcDates is still empty after checking state, default to the most recent forecast
            if (tempFcDates.length === 0) {
                tempFcDates.push(seriesData.history[seriesData.history.length - 1].date);
            }

            seriesData.history.forEach(block => {
                const forecastDate = block.date;
                const li = document.createElement('li');
                li.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-center', 'forecast-list-item');
                li.textContent = forecastDate;
                li.dataset.forecastDate = forecastDate;

                if (tempFcDates.includes(forecastDate)) {
                    li.classList.add('active');
                }

                li.addEventListener('click', (event) => {
                    handleForecastSelection(event, forecastDate);
                });

                forecastsList.appendChild(li);
            });
        } else {
            const li = document.createElement('li');
            li.classList.add('list-group-item');
            li.textContent = 'No forecasts available.';
            forecastsList.appendChild(li);
        }
    }

    renderPopupChart(currentSeriesData); // Render chart regardless of type
    seriesDetailModal.show();

    /**
     * Handles the selection and deselection of forecast dates in the modal.
     * Supports single selection and multi-selection with Ctrl/Cmd key.
     * @param {Event} event - The click event.
     * @param {string} forecastDate - The date of the forecast being selected/deselected.
     */
    function handleForecastSelection(event, forecastDate) {
        const li = event.currentTarget;

        if (event.ctrlKey || event.metaKey) {
            const index = tempFcDates.indexOf(forecastDate);
            if (index > -1) {
                tempFcDates.splice(index, 1);
                li.classList.remove('active');
            } else {
                tempFcDates.push(forecastDate);
                li.classList.add('active');
            }
        } else {
            tempFcDates = [forecastDate];
            document.querySelectorAll('#forecastsList .forecast-list-item').forEach(item => {
                item.classList.remove('active');
            });
            li.classList.add('active');
        }

        renderPopupChart(currentSeriesData);
    }

    /**
     * Renders the ECharts graph within the modal, displaying historical and selected forecast data.
     * @param {object} data - The series data to be displayed in the chart.
     */
    function renderPopupChart(data) {
        const actualModalChartContainer = document.getElementById('modalChartContainer');

        if (typeof echarts === 'undefined') {
            console.error("ECharts library is not loaded. Please ensure 'echarts.min.js' or 'echarts.js' is included in your HTML before this script.");
            return;
        }

        if (modalChartInstance) {
            echarts.dispose(modalChartInstance);
        }
        modalChartInstance = echarts.init(actualModalChartContainer);

        const displaySeries = [];
        const isIndustrySeries = state.dataTypeMap.get(data.series_id) === 'Industry';

        // --- Handle Industry Series Data ---
        if (isIndustrySeries) {
            const historicalValues = new Array(data.dates.length).fill(null); // Use data.dates for array size

            const mostRecentHistoryEntry = data.history[data.history.length - 1];
            if (mostRecentHistoryEntry) {
                // Populate historical values based on `is_forecast` flag
                for (let i = 0; i < mostRecentHistoryEntry.is_forecast.length; i++) {
                    if (!mostRecentHistoryEntry.is_forecast[i]) {
                        historicalValues[i] = mostRecentHistoryEntry.values[i];
                    }
                }
            } else {
                console.warn(`No history entry found for Industry series ${data.series_id}`);
            }

            const historicalSeries = {
                name: 'Historical',
                type: 'line',
                data: historicalValues,
                smooth: true,
                showSymbol: false,
                lineStyle: {
                    width: 2,
                    color: '#0056b3', // Dark blue for historical
                    type: 'solid'
                },
                itemStyle: {
                    color: '#070659'
                },
                connectNulls: true
            };
            displaySeries.push(historicalSeries);

            // Add selected forecasts for Industry series
            if (tempFcDates && tempFcDates.length > 0) {
                tempFcDates.forEach((selectedDate, index) => {
                    const forecastEntry = data.history.find(block => block.date === selectedDate);
                    if (forecastEntry) {
                        // Pass series base color for consistency or a distinct color from palette
                        const seriesColor = forecastColorPalette[index % forecastColorPalette.length];
                        displaySeries.push(getForecastValues(data, selectedDate, seriesColor, index, data.dates));
                    }
                });
            }
        }
        // --- Handle FRED Series Data ---
        else { 
            const fredValues = new Array(data.dates.length).fill(null);

            // Populate fredValues based on data.dates and data.values
            data.dates.forEach((date, i) => {
                fredValues[i] = data.values[i]; // All FRED data is historical
            });

            const fredSeries = {
                name: data.name, // FRED series name
                type: 'line',
                data: fredValues,
                smooth: true,
                showSymbol: false,
                lineStyle: {
                    width: 2,
                    color: '#0056b3', 
                    type: 'solid'
                },
                itemStyle: {
                    color: '#0056b3'
                },
                connectNulls: true
            };
            displaySeries.push(fredSeries);
        }


        const option = {
            title: {
                text: `${data.name}`,
                left: 'center',
                textStyle: {
                    fontSize: 16
                }
            },
            tooltip: {
                trigger: 'axis',
                formatter: function(params) {
                    if (!params || params.length === 0) {
                        return '';
                    }
                    let tooltipContent = `<span style="font-size: 14px;">Date: ${params[0].name}</span><br/>`;
                    params.forEach(param => {
                        const value = typeof param.value === 'number' ? param.value : null;
                        if (value !== null) {
                            tooltipContent += `<span style="font-size: 14px;">${param.marker} ${param.seriesName}: ${value.toFixed(2)}</span><br/>`;
                        }
                    });
                    return tooltipContent;
                }
            },
            legend: {
                show: true,
                top: 'bottom',
                left: 'center',
                padding: [0, 10, 10, 10],
                type: 'scroll',
                formatter: function(name) {
                    if (name.includes('Forecast as of:')) {
                        return name.replace('Forecast as of: ', 'Fc: ');
                    }
                    return name;
                },
                textStyle: {
                    fontSize: 12
                }
            },
            xAxis: {
                type: 'category',
                data: data.dates, 
                axisLabel: {
                    formatter: function(value) {
                        const date = new Date(value);
                        return date.getFullYear();
                    }
                }
            },
            yAxis: {
                type: 'value',
                name: 'Value',
                nameLocation: 'middle',
                nameGap: 50
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '15%',
                top: '10%',
                containLabel: true
            },
            series: displaySeries
        };

        modalChartInstance.setOption(option);
        modalChartInstance.resize();
    }
}