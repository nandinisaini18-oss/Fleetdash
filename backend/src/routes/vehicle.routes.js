import express from "express";
import {
    createVehicle,
    getVehicles,
    getVehicleById
} from "../controllers/vehicle.controller.js";

const router = express.Router();

router.post("/", createVehicle);
router.get("/", getVehicles);
router.get("/:id", getVehicleById);

export default router;