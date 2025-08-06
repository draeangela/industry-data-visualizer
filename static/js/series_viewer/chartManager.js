import * as state from '../state.js';
import { getSeriesData } from '../dataFetch.js';
import { generateRandomSeriesColor } from './colorManager.js';

let myChart = null;
let displaySeries = [];

/**
 * Downloads the current chart as a PNG image.
 */
export function downloadChartAsImage() {
    try {
        const imageUrl = myChart.getDataURL({
            pixelRatio: 2,
            backgroundColor: '#fff'
        })

        const a = document.createElement('a');
        a.href = imageUrl;
        a.download = 'chart.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    } catch (error) {
        console.error('Error downloading chart as image:', error);
        alert('Failed to download chart image. Please try again.');
    }
}

/**
 * Initializes the ECharts instance and sets up a resize listener to ensure
 * the chart resizes with the window.
 * @param {object} chartInstance - The ECharts instance to manage.
 */
export function initializeChart(chartInstance) {
    myChart = chartInstance;
    window.addEventListener('resize', () => {
        if (myChart) {
            myChart.resize();
        }
    });
}

/**
 * Retrieves and formats forecast values for a given series and forecast date,
 * ready to be used as an ECharts series. It applies appropriate styling
 * based on the current chart type (line or bar).
 * @param {object} chartDataForSeries - The complete data object for the series.
 * @param {string} forecastDate - The specific date of the forecast to retrieve.
 * @param {string} seriesBaseColor - The base color of the series for consistent styling.
 * @param {number} shadeIndex - An index used to select a shade from the forecast color palette.
 * @param {string[]} allDates - An array of all dates present in the chart for alignment.
 * @returns {object} An ECharts series configuration object for the forecast.
 */
export function getForecastValues(chartDataForSeries, forecastDate, seriesBaseColor, shadeIndex, allDates) {
    const { forecastShades } = state.seriesColorsMap.get(chartDataForSeries.series_id) || { forecastShades: [] };
    const colorToUse = forecastShades[shadeIndex % forecastShades.length] || seriesBaseColor || '#ff7f0e'; // Fallback to a default color if needed

    let dataValues = new Array(allDates.length).fill(null); // Initialize with nulls for all dates

    if (chartDataForSeries) {
        const forecastEntry = chartDataForSeries.history.find(entry => entry.date === forecastDate);

        if (forecastEntry) {
            const isForecastArray = forecastEntry.is_forecast;
            const valuesArray = forecastEntry.values;

            // Create a map for quick lookup of forecast values by date
            const forecastDataMap = new Map();
            for (let i = 0; i < chartDataForSeries.dates.length; i++) {
                if (isForecastArray[i]) {
                    forecastDataMap.set(chartDataForSeries.dates[i], valuesArray[i]);
                }
            }

            // Populate dataValues based on allDates
            allDates.forEach((date, index) => {
                if (forecastDataMap.has(date)) {
                    dataValues[index] = forecastDataMap.get(date);
                }
            });

        } else {
            console.warn(`No forecast data found for date: ${forecastDate} in series ID ${chartDataForSeries.series_id}`);
        }
    } else {
        console.warn("No series data provided when trying to get forecast values.");
    }

    let seriesConfig = {
        name: `Forecast as of: ${forecastDate} (${chartDataForSeries ? chartDataForSeries.name : 'N/A'})`,
        smooth: true,
        showSymbol: false, 
        data: dataValues,
        connectNulls: true, 
    };

    if (state.chartType === 'Line') {
        seriesConfig.type = 'line';
        seriesConfig.lineStyle = {
            width: 2,
            color: colorToUse,
            type: 'dashed'
        };
    } else if (state.chartType === 'Bar') {
        seriesConfig.type = 'bar';
        seriesConfig.itemStyle = {
            opacity: 0.4,
            color: colorToUse
        };
    }

    return seriesConfig;
}

/**
 * Refreshes the chart with data for the given series IDs. It fetches data,
 * determines the overall date range, and then plots historical data and
 * selected forecasts for Industry series, or just historical data for FRED series,
 * applying appropriate styling based on the current chart type and plot mode.
 * @param {string[]} seriesIds - An array of series IDs to display on the chart.
 */
export async function refreshChart(seriesIds) {
    if (!myChart) {
        console.warn("Chart not initialized. Cannot refresh.");
        return;
    }

    myChart.clear();
    displaySeries = [];
    let allDates = new Set();
    const allChartData = [];

    for (const id of seriesIds) {
        if (state.tempIsVisible.get(id) === true) {
            try {
                const chartData = await getSeriesData(id);
                allChartData.push(chartData);

                if (chartData && chartData.dates && Array.isArray(chartData.dates)) {
                    chartData.dates.forEach(date => allDates.add(date));
                }
            } catch (error) {
                console.error(`Failed to fetch data for series ID ${id}:`, error);
            }
        }
    }

    allDates = Array.from(allDates).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    allChartData.forEach(chartData => {
        let seriesColors = state.seriesColorsMap.get(chartData.series_id);
        if (!seriesColors) {
            seriesColors = generateRandomSeriesColor();
            state.setSeriesColors(chartData.series_id, seriesColors.base, seriesColors.forecastShades);
        }
        const seriesBaseColor = seriesColors.base;

        if (state.dataTypeMap.get(chartData.series_id) === 'Industry') {
            // Plot historical data for Industry series
            const historicalValues = new Array(allDates.length).fill(null); // Initialize with nulls

            const actualDataMap = new Map();
            chartData.history.forEach(entry => {
                chartData.dates.forEach((date, i) => {
                    if (entry.is_forecast && !entry.is_forecast[i] && entry.values[i] !== null && entry.values[i] !== undefined) {
                        actualDataMap.set(date, entry.values[i]);
                    }
                });
            });

            // Populate historicalValues based on allDates using the actualDataMap
            allDates.forEach((date, index) => {
                if (actualDataMap.has(date)) {
                    historicalValues[index] = actualDataMap.get(date);
                }
            });
            
            // Extract model name ! NEEDS FIX !
            const extractModelName = (path) => {
                const parts = path.replace(/\\/g, '/').split('/');
                const targetPart = parts[3];
                return targetPart ? targetPart.replace(/^\d+\./, '').replace(/_/g, ' ').trim().toUpperCase() : '';
            };
            let modelName = extractModelName(chartData.block_name);
         
            let historicalSeries = {
                name: `${chartData.name} (MODEL: ${modelName})`,
                data: historicalValues,
                smooth: true,
                showSymbol: false, 
                connectNulls: true, 
            };

            if (state.chartType === 'Line') {
                historicalSeries.type = 'line';
                historicalSeries.lineStyle = {
                    width: 2,
                    color: seriesBaseColor,
                    type: 'solid'
                };
                historicalSeries.itemStyle = {
                    color: seriesBaseColor
                };
            } else if (state.chartType === 'Bar') {
                historicalSeries.type = 'bar';
                historicalSeries.itemStyle = {
                    color: seriesBaseColor
                };
            }

            if (state.plotMode == 'A' || state.plotMode == 'H') {
                displaySeries.push(historicalSeries);
            }


            if (state.plotMode == 'A' || state.plotMode == 'F') {
                const selectedFcDates = state.selectedForecastsMap.get(chartData.series_id);
                if (selectedFcDates) {
                    selectedFcDates.forEach((fcDate, index) => {
                        displaySeries.push(getForecastValues(chartData, fcDate, seriesBaseColor, index, allDates));
                    });
                }
            }
        } else { // FRED data
            const fredValues = new Array(allDates.length).fill(null); 

            // Create a map for quick lookup of FRED values by date
            const fredDataMap = new Map();
            chartData.dates.forEach((date, i) => {
                fredDataMap.set(date, chartData.values[i]);
            });

            // Populate fredValues based on allDates
            allDates.forEach((date, index) => {
                if (fredDataMap.has(date)) {
                    fredValues[index] = fredDataMap.get(date);
                }
            });

            let fredSeries = {
                name: `${chartData.name}`,
                data: fredValues,
                smooth: true,
                showSymbol: false,
                connectNulls: true, 
            };

            if (state.chartType === 'Line') {
                fredSeries.type = 'line';
                fredSeries.lineStyle = {
                    width: 2,
                    color: seriesBaseColor,
                    type: 'solid'
                };
                fredSeries.itemStyle = {
                    color: seriesBaseColor
                };
            } else if (state.chartType === 'Bar') {
                fredSeries.type = 'bar';
                fredSeries.itemStyle = {
                    color: seriesBaseColor
                };
            }

            displaySeries.push(fredSeries)
        }
    });
    
    const option = {
        title: {
            text: `${state.viewTitle}`,
            left: '2%',
            textStyle: {
                fontSize: 25
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

                    if (value === null) {
                        return;
                    }
                    let seriesName = param.seriesName;
                    tooltipContent += `<span style="font-size: 14px;">${param.marker} ${seriesName}: ${value.toFixed(2)}</span><br/>`;
                });
                return tooltipContent;
            },
            axisPointer: {
                animation: false
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
                    const match = name.match(/Forecast as of: (.+?) \((.+?)\)/);
                    if (match && match[1] && match[2]) {
                        const dateString = match[1];
                        const seriesDisplayName = match[2];
                        return `Forecast as of: ${dateString} (${seriesDisplayName})`;
                    }
                }
                return name;
            },
            textStyle: {
                fontSize: 12
            }
        },
        xAxis: {
            type: 'category',
            data: allDates,
            axisLabel: {
                formatter: function(value) {
                    const date = new Date(value);
                    const year = date.getFullYear();
                    return `${year}`;
                },
                fontSize: 12
            }
        },
        yAxis: {
            type: 'value',
            name: 'Value',
            nameLocation: 'middle',
            nameGap: 50,
            axisLabel: {
                formatter: '{value}',
                fontSize: 12
            },
            nameTextStyle: {
                fontSize: 14
            }
        },
        series: displaySeries,
        dataZoom: [{
            type: 'inside',
            start: 0,
            end: 100
        }, {
            type: 'slider',
            show: true,
            start: 0,
            end: 100,
            bottom: 40
        }],
        grid: {
            left: '3%',
            right: '4%',
            bottom: 100,
            top: 80,
            containLabel: true
        },
    };
    myChart.setOption(option)
    myChart.resize();
}