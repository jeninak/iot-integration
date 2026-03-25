// send_data.js
// Fetches electricity value from public API and sends to IoT-Ticket

const axios = require("axios");

// --- IoT-Ticket config from environment variables ---
const IOT_USER = process.env.IOT_USER;   // device@tenant
const IOT_PASS = process.env.IOT_PASS;   // IoT-Ticket password
const TENANT   = process.env.TENANT;     // IoT-Ticket tenant ID
const DEVICE   = process.env.DEVICE;     // IoT-Ticket device ID

const IOT_URL = `https://cloud.iot-ticket.com/http-adapter/telemetry/${TENANT}/${DEVICE}`;

// --- Public API URL ---
const API_URL = "https://www.cc.puv.fi/~e2301774/iot_integration/electricity.json";

// --- Main function ---
async function run() {
    try {
        console.log("Fetching electricity data from public API...");

        const res = await axios.get(API_URL, { timeout: 10000 });
        const data = res.data;

        if (!data || data.electricity_kwh === undefined) {
            throw new Error("No electricity value in API response");
        }

        const payload = {
            electricity_kwh: Number(data.electricity_kwh),
            ts: new Date().toISOString()  // current timestamp
        };

        console.log("Sending to IoT-Ticket:", payload);

        await axios.put(IOT_URL, payload, {
            auth: { username: IOT_USER, password: IOT_PASS }
        });

        console.log("Success! Data sent to IoT-Ticket.");
    } catch (err) {
        console.error("Error:", err.message);
    }
}

// --- Run the script ---
run();
