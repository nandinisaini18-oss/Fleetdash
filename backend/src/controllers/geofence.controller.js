import mongoose from "mongoose";
import Geofence from "../models/geofence.model.js";

// Create Geofence
export const createGeofence = async (req, res, next) => {
    try {
        const { name, coordinates } = req.body;

        if (!name || !coordinates) {
            return res.status(400).json({
                success: false,
                message: "Name and coordinates are required"
            });
        }

        if (!Array.isArray(coordinates)) {
            return res.status(400).json({
                success: false,
                message: "Coordinates must be an array"
            });
        }

        const geofence = await Geofence.create({
            name,
            coordinates
        });

        return res.status(201).json({
            success: true,
            message: "Geofence created successfully",
            data: geofence
        });

    } catch (error) {
        next(error);
    }
};


// Get All Geofences
export const getGeofences = async (req, res, next) => {
    try {
        const geofences = await Geofence.find()
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: geofences.length,
            data: geofences
        });

    } catch (error) {
        next(error);
    }
};


// Get Geofence By ID
export const getGeofenceById = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid geofence ID"
            });
        }

        const geofence = await Geofence.findById(id);

        if (!geofence) {
            return res.status(404).json({
                success: false,
                message: "Geofence not found"
            });
        }

        return res.status(200).json({
            success: true,
            data: geofence
        });

    } catch (error) {
        next(error);
    }
};


// Update Geofence
export const updateGeofence = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid geofence ID"
            });
        }

        const { name, coordinates, status } = req.body;

        const geofence = await Geofence.findByIdAndUpdate(
            id,
            {
                name,
                coordinates,
                status
            },
            {
                new: true,
                runValidators: true
            }
        );

        if (!geofence) {
            return res.status(404).json({
                success: false,
                message: "Geofence not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Geofence updated successfully",
            data: geofence
        });

    } catch (error) {
        next(error);
    }
};


// Delete Geofence
export const deleteGeofence = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid geofence ID"
            });
        }

        const geofence = await Geofence.findByIdAndDelete(id);

        if (!geofence) {
            return res.status(404).json({
                success: false,
                message: "Geofence not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Geofence deleted successfully"
        });

    } catch (error) {
        next(error);
    }
};