import http from "k6/http";
import { check } from "k6";

export const options = {
    scenarios: {
        ingest: {
            executor: "constant-arrival-rate",
            rate: 2000,
            timeUnit: "1s",
            duration: "30s",
            preAllocatedVUs: 200,
            maxVUs: 500
        }
    },
    thresholds: {
        http_req_failed: ["rate<0.01"],
        http_req_duration: ["p(95)<200"]
    }
};

const VEHICLE_IDS = [
    "6a8fc5f243defff041a8bcbd",
    "6a8fc5f243defff041a8bcbe",
    "6a8fc5f243defff041a8bcbf",
    "6a8fc5f243defff041a8bcc0",
    "6a8fc5f243defff041a8bcc1",
    "6a8fc5f243defff041a8bcc2",
    "6a8fc5f243defff041a8bcc3",
    "6a8fc5f243defff041a8bcc4",
    "6a8fc5f243defff041a8bcc5",
    "6a8fc5f243defff041a8bcc6",
    "6a8fc5f343defff041a8bcc7",
    "6a8fc5f343defff041a8bcc8",
    "6a8fc5f343defff041a8bcc9",
    "6a8fc5f343defff041a8bcca",
    "6a8fc5f343defff041a8bccb",
    "6a8fc5f343defff041a8bccc",
    "6a8fc5f343defff041a8bccd",
    "6a8fc5f343defff041a8bcce",
    "6a8fc5f343defff041a8bccf",
    "6a8fc5f343defff041a8bcd0"
];

export default function () {
    const now = new Date();
    const vehicleId = VEHICLE_IDS[Math.floor(Math.random() * VEHICLE_IDS.length)];

    const payload = JSON.stringify({
        vehicleId: vehicleId,
        timestamp: now.toISOString(),
        latitude: 22.7 + Math.random() * 0.1,
        longitude: 75.8 + Math.random() * 0.1,
        speed: Math.random() * 100,
        heading: Math.random() * 360
    });

    const res = http.post(
        "http://localhost:3000/api/telemetry",
        payload,
        { headers: { "Content-Type": "application/json" } }
    );

    check(res, {
        "status is 201": (r) => r.status === 201
    });
}