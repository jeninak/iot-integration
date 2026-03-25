// Import axios for HTTP requests
const axios = require("axios");

// Load credentials and identifiers from environment variables
const USER = process.env.IOT_USER;    // IoT-Ticket username (DEVICE_ID@TENANT)
const PASS = process.env.IOT_PASS;    // IoT-Ticket device password
const TENANT = process.env.TENANT;    // IoT-Ticket tenant ID
const DEVICE = process.env.DEVICE;    // IoT-Ticket device ID

// Construct the IoT-Ticket telemetry endpoint URL
const IOT_URL = `https://cloud.iot-ticket.com/http-adapter/telemetry/${TENANT}/${DEVICE}`;

// Function to build the Nuuka API URL
function buildUrl() {
    const end = new Date();           // Current date
    const start = new Date();         // Start date is 2 days before end
    start.setDate(end.getDate() - 2);

    const startStr = start.toISOString().split("T")[0]; // Format YYYY-MM-DD
    const endStr = end.toISOString().split("T")[0];     // Format YYYY-MM-DD

    // Nuuka API URL for daily electricity data for Hakaniemen kauppahalli
    return `https://helsinki-openapi.nuuka.cloud/api/v1.0/EnergyData/Daily/ListByProperty?Record=LocationName&SearchString=1000%20Hakaniemen%20kauppahalli&ReportingGroup=Electricity&StartTime=${startStr}&EndTime=${endStr}`;
}

// Convert Nuuka .NET style timestamp to JS Date if possible
function parseNuukaDate(nuukaTs) {
    if (!nuukaTs) return new Date(); // Fallback: current date if null/undefined
    const match = /\/Date\((\d+)\)\//.exec(nuukaTs);
    if (match) return new Date(Number(match[1]));
    // If not .NET format, try normal Date parsing
    const parsed = new Date(nuukaTs);
    if (!isNaN(parsed)) return parsed;
    // Final fallback: current date
    return new Date();
}

// Main function to fetch data and send it to IoT-Ticket
async function run() {
    try {
        console.log("Fetching Nuuka data...");

        // Fetch data from Nuuka API
        const res = await axios.get(buildUrl(), { timeout: 10000 });
        const data = res.data;

        // Check that data exists
        if (!data || data.length === 0) throw new Error("No data received");

        // Take the latest entry
        const latest = data[data.length - 1];

        // Ensure Value exists and is numeric
        const value = Number(latest.Value);
        if (isNaN(value)) throw new Error("Latest Value is not a number");

        const payload = {
            electricity_kwh: value,                // Electricity value
            ts: parseNuukaDate(latest.Timestamp).toISOString()  // Safe timestamp
        };

        console.log("Sending to IoT-Ticket:", payload);

        // Send the telemetry data to IoT-Ticket using Basic Auth
        await axios.put(IOT_URL, payload, {
            auth: { username: USER, password: PASS }
        });

        console.log("Success");
    } catch (err) {
        console.error("Error:", err.message);
    }
}

// Run the script
run();
