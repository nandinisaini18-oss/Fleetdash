import express from "express";

import {
    createGeofence
} from "../controllers/geofence.controller.js";

const router = express.Router();

router.post("/", createGeofence);

export default router;