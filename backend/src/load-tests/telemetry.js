import http from "k6/http";
import { check, sleep } from "k6";

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

// Replace with a real vehicleId (_id) from your Vehicle collection
const VEHICLE_ID = "REPLACE_WITH_REAL_VEHICLE_ID";

export default function () {
    const now = new Date();

    const payload = JSON.stringify({
        vehicleId: VEHICLE_ID,
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