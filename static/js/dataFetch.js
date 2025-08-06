import * as state from './state.js'

/**
 * Fetches time series data for a given series ID.
 * It differentiates between 'Industry' and 'FRED' data sources.
 *
 * @param {string} seriesId - The ID of the series to fetch.
 * @returns {Promise<Object>} A promise that resolves to an object containing the series data.
 * @throws {Error} Throws an error if the fetch operation fails, or if series metadata/data is not found.
 */
export async function getSeriesData(seriesId) {
    if (state.dataTypeMap.get(seriesId) === 'Industry') {
        const fetchurl = `https://${state.server}:9000/`;

        const endpoint = `${fetchurl}series_history?id=${seriesId}`;

        console.log("Attempting to fetch INDUSTRY series from:", endpoint);

        try {
            const response = await fetch(endpoint);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! Status: ${response.status}, Details: ${errorText}`);
            }

            const data = await response.json();
            console.log("Data successfully fetched for series ID", seriesId, ":", data);
            return data;
        } catch (error) {
            console.error("Fetch Error for series ID", seriesId, ":", error);
            throw error;
        }
    } else {

        console.log(seriesId)
    const endpoint = `https://${state.server}:8000/series/${seriesId}`;


        console.log("Attempting to fetch INDUSTRY series from:", endpoint);

        try {
            const response = await fetch(endpoint);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! Status: ${response.status}, Details: ${errorText}`);
            }

            const data = await response.json();
            console.log("Data successfully fetched for series ID", seriesId, ":", data);
            return data;
        } catch (error) {
            console.error("Fetch Error for series ID", seriesId, ":", error);
            throw error;
        }
    }
}

/**
 * Fetches all available FRED sectors.
 * It updates the application's state with the fetched sectors.
 *
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of sector objects (id, name).
 * @throws {Error} Throws an error if the fetch operation fails.
 */
export async function fetchFredSectors() {
    try {
        const response = await fetch(`https://${state.server}:8000/sectors`);
        if (!response.ok) {
            console.error('Failed to fetch all sectors:', response.statusText);
            return [];
        }
        const data = await response.json();
        state.setAllFredSectors(Array.isArray(data) && data.every(item => typeof item === 'string')
            ? data.map(name => ({ id: name, name: name }))
            : data);
        console.log('All sectors loaded:', state.allFredSectors);
        return state.allFredSectors;
    } catch (error) {
        console.error('Error fetching all sectors:', error);
        return [];
    }
}

/**
 * Retrieves model-specific data for a given model ID the Industry Database.
 *
 * @param {string} modelId - The ID of the model to fetch.
 * @returns {Promise<Object>} A promise that resolves to an object containing model name, ID, and series data.
 * @throws {Error} Throws an error if the fetch operation fails.
 */
export async function getModelData(modelId){
    const fetchurl = `https://${state.server}:9000/`;
    const endpoint = `${fetchurl}model_series?id=${modelId}`

    console.log("Attemping to fetch Industry model from:", endpoint);

    try {
        const response = await fetch(endpoint);

        if (!response.ok){
            const errorText = await response.text();
            throw new Error(`HTTP error! Status: ${response.status}, Details: ${errorText}`);
        }

        const data = await response.json();

        return {
            model_name: data.file_name,
            model_id: modelId,
            series: data.series
        }

    } catch (error) {
        console.error("Fetch Error for series ID", modelId, ":", error);
        throw error;
    }

}
