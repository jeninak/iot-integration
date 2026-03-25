// nuuka_latest_energy.js
// Fetches the newest hourly energy data from Nuuka Open API

const axios = require("axios");

// --- Config ---
const CUSTOMER = "Helsinki"; // Customer parameter
const TARGET_LOCATION = "1000 Hakaniemen Kauppahalli"; // Exact LocationName
const REPORTING_GROUP = "Electricity"; // Could be Heating, etc.
const DAYS_BACK = 1; // How many past days to fetch

// --- Nuuka API Endpoints ---
const PROPERTY_LIST_URL = `https://helsinki-openapi.nuuka.cloud/api/v1.0/Property/List?Customer=${CUSTOMER}`;

// Convert Nuuka timestamp /Date(1679870400000)/ to JS Date
function parseNuukaDate(ts) {
    const match = /\/Date\((\d+)\)\//.exec(ts);
    return match ? new Date(Number(match[1])) : new Date();
}

// Build URL for Hourly Energy Data
function buildHourlyUrl(locationName) {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - DAYS_BACK);

    const startStr = start.toISOString().split("T")[0];
    const endStr = end.toISOString().split("T")[0];

    return `https://helsinki-openapi.nuuka.cloud/api/v1.0/EnergyData/Hourly/ListByProperty?Customer=${CUSTOMER}&Record=LocationName&SearchString=${encodeURIComponent(locationName)}&ReportingGroup=${REPORTING_GROUP}&StartTime=${startStr}&EndTime=${endStr}`;
}

// Main function
async function run() {
    try {
        console.log("Fetching property list...");
        const propRes = await axios.get(PROPERTY_LIST_URL, { timeout: 10000 });
        const properties = propRes.data;

        const property = properties.find(p => p.LocationName === TARGET_LOCATION);
        if (!property) {
            throw new Error(`Property "${TARGET_LOCATION}" not found in Property/List`);
        }
        console.log("Found property:", property.LocationName);

        const hourlyUrl = buildHourlyUrl(property.LocationName);
        console.log("Fetching hourly energy data...");
        const dataRes = await axios.get(hourlyUrl, { timeout: 10000 });
        const data = dataRes.data;

        if (!data || data.length === 0) {
            console.warn("No energy data returned for this property.");
            return;
        }

        const latest = data[data.length - 1];
        const latestTime = parseNuukaDate(latest.Timestamp);

        console.log("Latest energy data:");
        console.log(`Time: ${latestTime.toISOString()}`);
        console.log(`Electricity kWh: ${latest.Value}`);
    } catch (err) {
        console.error("Error:", err.message);
    }
}

// Run
run();
