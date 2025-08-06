import * as state from '../state.js'

document.addEventListener('DOMContentLoaded', function() {
    const seriesTableContainer = document.getElementById('series-table-container');

    // Initialize Bootstrap modal instances once DOM is ready
    const seriesPreviewModalElement = document.getElementById('seriesPreviewModal');
    const seriesPreviewModal = new bootstrap.Modal(seriesPreviewModalElement);
    const modalSeriesDescription = document.getElementById('modalSeriesDescription');
    const modalChartContainer = document.getElementById('modalChartContainer');

    // Parse sector names from URL
    const urlParams = new URLSearchParams(window.location.search);
    let rawSectorIdentifier = urlParams.get('sector');

    if (!rawSectorIdentifier) {
        console.error('Error: Sector name not found in URL. Please navigate from the main page.');
        seriesTableContainer.innerHTML = '<p style="color: red;">No sector selected. Please choose a sector from the navigation menu.</p>';
        return;
    }

    let sectorNameForApi = rawSectorIdentifier.replace(/_/g, '%20')
                                               .split('%20')
                                               .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                               .join('%20');

    const displaySectorName = rawSectorIdentifier.replace(/_/g, ' ')
                                               .split(' ')
                                               .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                               .join(' ');

    console.log(sectorNameForApi);
    const apiUrl = `https://${state.server}:8000/sectors/${sectorNameForApi}`;

    if (!seriesTableContainer) {
        console.error('Error: Series table container not found. Check your HTML.');
        return;
    }

    const sectorHeading = document.querySelector('.w-full h2');
    if (sectorHeading) {
        sectorHeading.textContent = `${displaySectorName} Series`;
        document.title = `${displaySectorName} Sector Series - ARGA Industry Model Visualizer`;
    }

    /**
     * Fetches series data from the API for the current sector and renders it into a table.
     * It also sets up event listeners for table interactions like checkbox changes and preview button clicks.
     * @async
     * @function loadSeriesData
     * @returns {Promise<void>} A Promise that resolves when the data is loaded and rendered.
     */
    async function loadSeriesData() {
        seriesTableContainer.innerHTML = '<p>Fetching series data, please wait...</p>';

        try {
            const response = await fetch(apiUrl);

            if (!response.ok) {
                const errorBody = await response.text();
                if (response.status === 404) {
                    throw new Error(`Sector not found on API: ${apiUrl}. Please check the sector name.`);
                }
                throw new Error(`HTTP error! Status: ${response.status}, Body: ${errorBody}`);
            }

            const responseData = await response.json();
            if (!responseData.series || typeof responseData.series !== 'object') {
                throw new Error("Invalid API response format: 'series' property not found or not an object.");
            }

            const seriesList = Object.values(responseData.series);

            if (!seriesList || seriesList.length === 0) {
                seriesTableContainer.innerHTML = '<p>No series found for this sector.</p>';
                return;
            }

            const table = document.createElement('table');
            table.classList.add('series-table', 'table', 'table-striped', 'table-hover');

            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');
            ['', 'Series Description', 'Frequency', 'ID', ''].forEach(text => {
                const th = document.createElement('th');
                th.textContent = text;
                headerRow.appendChild(th);
            });
            thead.appendChild(headerRow);
            table.appendChild(thead);

            const tbody = document.createElement('tbody');
            seriesList.forEach(series => {
                const row = document.createElement('tr');

                const checkboxCell = document.createElement('td');
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.classList.add('series-checkbox');
                checkbox.id = `checkbox-${series.series_id}`;
                checkbox.setAttribute('data-series-id', series.series_id);

                checkboxCell.appendChild(checkbox);
                row.appendChild(checkboxCell);

                const nameCell = document.createElement('td');
                nameCell.textContent = series.series_description;
                row.appendChild(nameCell);

                const frequencyCell = document.createElement('td');
                frequencyCell.textContent = series.frequency || 'N/A';
                row.appendChild(frequencyCell);

                const idCell = document.createElement('td');
                idCell.textContent = series.series_id;
                row.appendChild(idCell);

                const visualizeCell = document.createElement('td');
                const viewButton = document.createElement('button');
                viewButton.textContent = 'Preview';
                viewButton.classList.add('btn', 'btn-sm', 'btn-custom-table-header', 'view-preview-button');
                viewButton.setAttribute('data-series-id', series.series_id);
                viewButton.setAttribute('data-series-description', series.series_description);

                visualizeCell.appendChild(viewButton);
                row.appendChild(visualizeCell);

                tbody.appendChild(row);
            });
            table.appendChild(tbody);

            seriesTableContainer.innerHTML = '';
            seriesTableContainer.appendChild(table);

            tbody.addEventListener('change', function(event) {
                console.log('Checkbox changed event detected!');
                if (event.target.classList.contains('series-checkbox')) {
                    const row = event.target.closest('tr');
                    if (row) {
                        console.log('Toggling class on row:', row);
                        if (event.target.checked) {
                            row.classList.add('selected-row');
                        } else {
                            row.classList.remove('selected-row');
                        }
                    }
                }
            });

            // "View Preview" button
            tbody.addEventListener('click', async function(event) {
                if (event.target.classList.contains('view-preview-button')) {
                    const button = event.target;
                    const seriesId = button.getAttribute('data-series-id');
                    const seriesDescription = button.getAttribute('data-series-description');

                    if (seriesId) {
                        console.log(`Loading preview for series ID: ${seriesId}`);
                        modalSeriesDescription.textContent = seriesDescription; // Update modal title

                        modalChartContainer.innerHTML = '<p style="text-align: center; padding: 20px;">Loading chart data...</p>';

                        try {
                            const seriesDataResponse = await fetch(`https://${state.server}:8000/series/${seriesId}`);
                            if (!seriesDataResponse.ok) {
                                throw new Error(`Failed to fetch data for series ${seriesId}: ${seriesDataResponse.statusText}`);
                            }
                            const dataForChart = await seriesDataResponse.json();

                            const dates = dataForChart.dates;
                            const values = dataForChart.values;

                            console.log('Parsed Dates:', dates);
                            console.log('Parsed Values:', values);

                            let chartInstance = echarts.getInstanceByDom(modalChartContainer);
                            if (chartInstance) {
                                echarts.dispose(chartInstance);
                            }
                            chartInstance = echarts.init(modalChartContainer);

                            const option = {
                                title: {
                                    text: `${seriesDescription}`,
                                    left: 'center',
                                    textStyle: {
                                        fontSize: 16
                                    }
                                },
                                tooltip: {
                                    trigger: 'axis',
                                    formatter: function (params) {
                                        params = params[0];
                                        const date = new Date(params.name);
                                        const formattedDate = date.getFullYear() + '-' +
                                            (date.getMonth() + 1).toString().padStart(2, '0') + '-' +
                                            date.getDate().toString().padStart(2, '0');
                                        return `${formattedDate}<br/>Value: ${params.value.toFixed(2)}`;
                                    }
                                },
                                xAxis: {
                                    type: 'category',
                                    data: dates,
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
                                    bottom: '3%',
                                    containLabel: true
                                },
                                series: [
                                    {
                                        name: seriesDescription,
                                        type: 'line',
                                        data: values,
                                        smooth: true,
                                        showSymbol: false,
                                        lineStyle: {
                                            width: 2
                                        },
                                    }
                                ]
                            };

                            chartInstance.setOption(option);
                            // Ensure chart resizes with modal
                            seriesPreviewModalElement.addEventListener('shown.bs.modal', function () {
                                chartInstance.resize();
                            });
                            window.addEventListener('resize', function() {
                                chartInstance.resize();
                            });


                        } catch (error) {
                            console.error('Error loading series data for modal:', error);
                            modalChartContainer.innerHTML = `<p style="color: red; text-align: center; padding: 20px;">Error loading series data: ${error.message}</p>`;
                        }

                        seriesPreviewModal.show(); 
                    }
                }
            });

            // "Select All" button
            const selectAllBtn = document.getElementById('selectAllCheckboxesBtn');
            if (selectAllBtn) {
                selectAllBtn.addEventListener('click', function() {
                    console.log('Select All button clicked!');
                    const allCheckboxes = document.querySelectorAll('.series-checkbox');
                    let allAreChecked = true;

                    allCheckboxes.forEach(checkbox => {
                        if (!checkbox.checked) {
                            allAreChecked = false;
                        }
                    });

                    allCheckboxes.forEach(checkbox => {
                        checkbox.checked = !allAreChecked; 
                        const row = checkbox.closest('tr');
                        if (row) {
                            if (checkbox.checked) {
                                row.classList.add('selected-row');
                            } else {
                                row.classList.remove('selected-row');
                            }
                        }
                    });

                    this.textContent = allAreChecked ? 'Select All' : 'Deselect All';
                });
            }

            // "Create Graph" button
            const createGraphBtn = document.getElementById('createGraphBtn');
            if (createGraphBtn) {
                createGraphBtn.addEventListener('click', function() {
                    console.log('Create Graph button clicked!');
                    const selectedSeriesIds = [];
                    const selectedSeriesDescriptions = []; 

                    document.querySelectorAll('.series-checkbox:checked').forEach(checkbox => {
                        selectedSeriesIds.push(checkbox.getAttribute('data-series-id'));
                        const row = checkbox.closest('tr');
                        if (row) {
                            const nameCell = row.querySelector('td:nth-child(2)'); 
                            if (nameCell) {
                                selectedSeriesDescriptions.push(encodeURIComponent(nameCell.textContent));
                            }
                        }
                    });


                    if (selectedSeriesIds.length > 0) {
                        // These parameters are no longer strictly necessary for passing data to series_viewer.html
                        // since state.js is used, but they can be kept if they serve another purpose.
                        const seriesIdsParam = selectedSeriesIds.join(',');
                        const seriesDescriptionsParam = selectedSeriesDescriptions.join('|||');

                        // Navigate to the series viewer page.
                        // seriesViewerLogic.js will now read state.selectedSeriesIds.
                        window.location.href = `./series_viewer.html?seriesIds=${encodeURIComponent(seriesIdsParam)}`;
                    } else {
                        // Use the custom message box function instead of the browser's alert().
                        showMessageBox('Please select at least one series to create a graph.');
                    }
                });
            }
        } catch (error) {
            console.error('Failed to load series data:', error);
            seriesTableContainer.innerHTML = `<p style="color: red;">Error loading series data: ${error.message}. Please ensure your backend is running and accessible and that the sector name '${displaySectorName}' is correctly handled by the API.</p>`;
        }
    }

    loadSeriesData();
});