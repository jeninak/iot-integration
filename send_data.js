// send_data.js
const axios = require("axios");

const IOT_USER = process.env.IOT_USER;
const IOT_PASS = process.env.IOT_PASS;
const TENANT   = process.env.TENANT;
const DEVICE   = process.env.DEVICE;

const IOT_URL = `https://cloud.iot-ticket.com/http-adapter/telemetry/${TENANT}/${DEVICE}`;
const API_URL = "https://www.cc.puv.fi/~e2301774/iot_integration/electricity.json";

async function run() {
    try {
        console.log("Fetching electricity data from public API...");
        const res = await axios.get(API_URL, { timeout: 10000 });
        const data = res.data;

        if (!data || data.electricity_kwh === undefined) {
            throw new Error("No electricity value in API response");
        }

        // --- Correct telemetry payload ---
        const payload = {
            ts: Date.now(),  // timestamp in milliseconds
            values: {
                electricity_kwh: Number(data.electricity_kwh)
            }
        };

        console.log("Sending to IoT-Ticket:", payload);

        const authHeader = Buffer.from(`${IOT_USER}:${IOT_PASS}`).toString("base64");

        await axios.put(IOT_URL, payload, {
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Basic ${authHeader}`
            }
        });

        console.log("Success! Data sent to IoT-Ticket.");
    } catch (err) {
        console.error("Error:", err.message);
        if (err.response) {
            console.error("Status:", err.response.status);
            console.error("Response:", err.response.data);
        }
    }
}

run();
