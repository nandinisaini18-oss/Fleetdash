import express from "express";

import {
    createGeofence,
    getGeofences,
    getGeofenceById,
    updateGeofence,
    deleteGeofence
} from "../controllers/geofence.controller.js";

const router = express.Router();

// router.post("/", createGeofence);

// router.get("/", getGeofences);

// router.get("/:id", getGeofenceById);

// router.patch("/:id", updateGeofence);

// router.delete("/:id", deleteGeofence);

// export default router;
router.post("/", createGeofence);
router.get("/", getGeofences);
router.get("/:id", getGeofenceById);
router.patch("/:id", updateGeofence);
router.delete("/:id", deleteGeofence);

export default router;