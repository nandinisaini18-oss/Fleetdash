import express from "express";

import {
    getOverviewAnalytics,
    getVehicleAnalytics,
    getTelemetryAnalytics,
    getGeofenceAnalytics
} from "../controllers/analytics.controller.js";

import { getSystemHealth } from "../controllers/analytics.controller.js";

const router = express.Router();

router.get(
    "/overview",
    getOverviewAnalytics
);

router.get(
    "/vehicles",
    getVehicleAnalytics
);

router.get(
    "/telemetry",
    getTelemetryAnalytics
);

router.get(
    "/geofences",
    getGeofenceAnalytics
);

router.get("/health", getSystemHealth);

export default router;