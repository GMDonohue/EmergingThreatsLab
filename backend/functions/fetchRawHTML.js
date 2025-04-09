import axios from "axios";

/**
 * Fetches the raw HTML of a webpage.
 * @param {string} url - The webpage URL.
 * @returns {Promise<string>} - The raw HTML as a string.
 */
export async function fetchRawHTML(url) {
    try {
        const response = await axios.get(url, {
            headers: { "User-Agent": "Mozilla/5.0" }, // Avoid bot blocking
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching raw HTML:", error);
        return null;
    }
}