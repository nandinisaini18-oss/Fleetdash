import mongoose from "mongoose";
import Vehicle from "../models/vehicle.model.js";

// Create Vehicle
export const createVehicle = async (req, res, next) => {
    try {
        const {
            vehicleId,
            registrationNumber,
            driverName
        } = req.body;

        // Required fields
        if (!vehicleId || !registrationNumber) {
            return res.status(400).json({
                success: false,
                message: "vehicleId and registrationNumber are required"
            });
        }

        // Check if vehicle already exists
        const existingVehicle = await Vehicle.findOne({
            $or: [
                { vehicleId },
                { registrationNumber }
            ]
        });

        if (existingVehicle) {
            return res.status(409).json({
                success: false,
                message: "Vehicle with this ID or registration number already exists"
            });
        }

        const vehicle = await Vehicle.create({
            vehicleId,
            registrationNumber,
            driverName
        });

        return res.status(201).json({
            success: true,
            message: "Vehicle created successfully",
            data: vehicle
        });

    } catch (error) {
        next(error);
    }
};


// Get All Vehicles
export const getVehicles = async (req, res, next) => {
    try {
        const vehicles = await Vehicle.find()
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: vehicles.length,
            data: vehicles
        });

    } catch (error) {
        next(error);
    }
};


// Get Vehicle By MongoDB ID
export const getVehicleById = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid vehicle ID"
            });
        }

        const vehicle = await Vehicle.findById(id);

        if (!vehicle) {
            return res.status(404).json({
                success: false,
                message: "Vehicle not found"
            });
        }

        return res.status(200).json({
            success: true,
            data: vehicle
        });

    } catch (error) {
        next(error);
    }
};


// Update Vehicle
export const updateVehicle = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid vehicle ID"
            });
        }

        const {
            registrationNumber,
            driverName,
            status
        } = req.body;

        const vehicle = await Vehicle.findByIdAndUpdate(
            id,
            {
                registrationNumber,
                driverName,
                status
            },
            {
                new: true,
                runValidators: true
            }
        );

        if (!vehicle) {
            return res.status(404).json({
                success: false,
                message: "Vehicle not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Vehicle updated successfully",
            data: vehicle
        });

    } catch (error) {
        next(error);
    }
};


// Delete Vehicle
export const deleteVehicle = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid vehicle ID"
            });
        }

        const vehicle = await Vehicle.findByIdAndDelete(id);

        if (!vehicle) {
            return res.status(404).json({
                success: false,
                message: "Vehicle not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Vehicle deleted successfully"
        });

    } catch (error) {
        next(error);
    }
};