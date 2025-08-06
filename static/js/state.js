// --- Core State Variables ---
export let selectedSeriesIds = [7917]
export let selectedForecastsMap = new Map();
export let isVisible = new Map();

// --- Temporary State Variables ---
export let tempSelectedSeriesIds = [];
export let tempIsVisible = new Map()
export let searchTimeout = null;

// --- View and Chart Configuration ---
export let viewTitle = 'Untitled View';
export let plotMode = 'A'
export let chartType = 'Line'
export const seriesColorsMap = new Map()
export let dataTypeMap = new Map();

// --- Search and Data Management Variables ---
export let allFredSectors = new Map();
export let allIndustryModels = new Map();
export let allSeriesMetadata = [];
export let cachedSectorSeries = new Map();
export let currentSearchType = 'all';
export let currentSelectedSectorId = null;
export let currentSelectedModelId = 0;

// -- Backend Server --
export let server = 'SERVER04'

// --- Core State Setters ---
export function setSelectedSeriesIds(ids) {
    selectedSeriesIds = ids;
}

export function setIsVisible(map) {
    isVisible = map;
}

// --- Temporary State Setters ---
export function setTempSelectedSeriesIds(ids) {
    tempSelectedSeriesIds = ids;
}

export function setTempIsVisible(map) {
    tempIsVisible = map;
}

export function setSearchTimeout(timeoutId) { // Add this setter
    searchTimeout = timeoutId;
}

// --- View and Chart Configuration Setters & Getters ---
export function setViewTitle(title) {
    viewTitle = title;
}

export function setSelectedForecastsMap(map) {
    selectedForecastsMap = map;
}

export function setPlotMode (char) {
    plotMode = char;
}

export function setChartType(type) {
    chartType = type
}

export function getChartType(){
    return chartType;
}

export function setSeriesColors(seriesId, baseColor, forecastShades) {
    seriesColorsMap.set(seriesId, { base: baseColor, forecastShades: forecastShades });
}

export function setDataTypeMap(map) {
    dataTypeMap = map;
}

// --- Search and Data Management Setters ---
export function setAllFredSectors(map) {
    allFredSectors = map;
}

export function setAllIndustryModels(map) {
    allIndustryModels = map;
}

export function setAllSeriesMetadata(map){
    allSeriesMetadata = map
}

export function setCurrentSelectedSectorId(id) {
    currentSelectedSectorId = id;
}

export function setCurrentSelectedModelId(id){
    currentSelectedModelId = id;
}

export function setCachedSectorSeries(map) {
    cachedSectorSeries = map;
}

export function setCurrentSearchType(type) {
    currentSearchType = type;
}

