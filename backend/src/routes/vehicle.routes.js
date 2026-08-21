import express from "express";

import {
    createVehicle,
    getVehicles,
    getVehicleById,
    updateVehicle,
    deleteVehicle
} from "../controllers/vehicle.controller.js";

const router = express.Router();

router.post("/", createVehicle);

router.get("/", getVehicles);

router.get("/:id", getVehicleById);

router.patch("/:id", updateVehicle);

router.delete("/:id", deleteVehicle);

export default router;