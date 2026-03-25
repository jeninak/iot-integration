const axios = require("axios");

// Environment variables for IoT-Ticket credentials
const USER = process.env.IOT_USER;    // DEVICE_ID@TENANT
const PASS = process.env.IOT_PASS;    // device password
const TENANT = process.env.TENANT;    
const DEVICE = process.env.DEVICE;    

// IoT-Ticket telemetry URL
const IOT_URL = `https://cloud.iot-ticket.com/http-adapter/telemetry/${TENANT}/${DEVICE}`;

// Build Nuuka API URL
function buildUrl() {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 2);

    const startStr = start.toISOString().split("T")[0];
    const endStr = end.toISOString().split("T")[0];

    return `https://helsinki-openapi.nuuka.cloud/api/v1.0/EnergyData/Daily/ListByProperty?Record=LocationName&SearchString=1000%20Hakaniemen%20kauppahalli&ReportingGroup=Electricity&StartTime=${startStr}&EndTime=${endStr}`;
}

// Main function to fetch data and send it to IoT-Ticket
async function run() {
    try {
        console.log("Fetching Nuuka data...");

        const res = await axios.get(buildUrl(), { timeout: 10000 });
        const data = res.data;

        if (!data || data.length === 0) throw new Error("No data received");

        const latest = data[data.length - 1];

        // Ensure Value exists and is numeric
        const value = Number(latest.Value);
        if (isNaN(value)) throw new Error("Latest Value is not a number");

        // Use CURRENT timestamp instead of Nuuka Timestamp
        const payload = {
            electricity_kwh: value,
            ts: new Date().toISOString()   // <-- Always valid ISO timestamp
        };

        console.log("Sending to IoT-Ticket:", payload);

        // Send telemetry to IoT-Ticket using Basic Auth
        await axios.put(IOT_URL, payload, {
            auth: { username: USER, password: PASS }
        });

        console.log("Success");
    } catch (err) {
        console.error("Error:", err.message);
    }
}

run();
