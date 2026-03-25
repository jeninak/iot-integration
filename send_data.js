// send_data_nuuka_safe.js
// Node.js script to fetch latest hourly electricity data from Nuuka API
// and send it to IoT-Ticket telemetry endpoint safely

const axios = require("axios");

// IoT-Ticket credentials from environment variables
const USER = process.env.IOT_USER;    // IoT-Ticket username (DEVICE_ID@TENANT)
const PASS = process.env.IOT_PASS;    // IoT-Ticket device password
const TENANT = process.env.TENANT;    // IoT-Ticket tenant ID
const DEVICE = process.env.DEVICE;    // IoT-Ticket device ID

// IoT-Ticket telemetry endpoint
const IOT_URL = `https://cloud.iot-ticket.com/http-adapter/telemetry/${TENANT}/${DEVICE}`;

// Nuuka API endpoints
const PROPERTY_LIST_URL = "https://helsinki-openapi.nuuka.cloud/api/v1.0/Property/List?Customer=Helsinki";

// Set the target property you want to fetch
const TARGET_LOCATION = "1000 Hakaniemen Kauppahalli"; // Must match exactly LocationName from Property/List

// Convert Nuuka timestamp like "/Date(1679870400000)/" to JS Date
function parseNuukaDate(nuukaTs) {
    const match = /\/Date\((\d+)\)\//.exec(nuukaTs);
    if (!match) {
        console.warn("No valid Nuuka timestamp, using current time");
        return new Date(); // fallback
    }
    return new Date(Number(match[1]));
}

// Get the correct property LocationName
async function getPropertyLocation() {
    try {
        const res = await axios.get(PROPERTY_LIST_URL, { timeout: 10000 });
        const properties = res.data;
        const match = properties.find(p => p.LocationName === TARGET_LOCATION);
        if (!match) throw new Error(`Property "${TARGET_LOCATION}" not found`);
        return match.LocationName;
    } catch (err) {
        throw new Error("Failed to fetch property list: " + err.message);
    }
}

// Build hourly energy data URL
function buildHourlyUrl(searchString) {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 1); // last 1 day

    const startStr = start.toISOString().split("T")[0];
    const endStr = end.toISOString().split("T")[0];

    return `https://helsinki-openapi.nuuka.cloud/api/v1.0/EnergyData/Hourly/ListByProperty?Customer=Helsinki&Record=LocationName&SearchString=${encodeURIComponent(searchString)}&ReportingGroup=Electricity&StartTime=${startStr}&EndTime=${endStr}`;
}

// Main function
async function run() {
    try {
        console.log("Fetching property list from Nuuka...");
        const propertyName = await getPropertyLocation();
        console.log("Found property:", propertyName);

        const hourlyUrl = buildHourlyUrl(propertyName);
        console.log("Fetching hourly energy data...");
        const res = await axios.get(hourlyUrl, { timeout: 10000 });
        const data = res.data;

        if (!data || data.length === 0) {
            console.warn("No energy data returned for this property. Skipping.");
            return;
        }

        // Take the latest datapoint
        const latest = data[data.length - 1];
        const payload = {
            electricity_kwh: Number(latest.Value),
            ts: parseNuukaDate(latest.Timestamp).toISOString()
        };

        console.log("Sending to IoT-Ticket:", payload);

        await axios.put(IOT_URL, payload, {
            auth: { username: USER, password: PASS }
        });

        console.log("Success!");
    } catch (err) {
        console.error("Error:", err.message);
    }
}

// Run the script
run();
