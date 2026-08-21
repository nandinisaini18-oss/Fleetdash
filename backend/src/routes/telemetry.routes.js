import express from "express";

import {
    ingestTelemetry
} from "../controllers/telemetry.controller.js";
import {getVehicleTelemetry} from "../controllers/telemetry.controller.js"

const router = express.Router();

router.post("/", ingestTelemetry);
router.get("/:vehicleId", getVehicleTelemetry);

export default router;