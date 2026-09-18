import mongoose from "mongoose";

import Geofence from "../models/geofence.model.js";

import {
    invalidateGeofenceCache
} from "../services/geofence.service.js";


// Validate a GeoJSON-style polygon payload: coordinates = [[[lng, lat], ...]].
// Returns an error message string, or null when the payload is valid.
function validateCoordinates(coordinates) {
    if (!Array.isArray(coordinates) || coordinates.length !== 1) {
        return "Coordinates must contain exactly one polygon ring";
    }

    const ring = coordinates[0];
    if (!Array.isArray(ring) || ring.length < 5) {
        return "Polygon ring must contain at least 4 corners plus the closing coordinate";
    }

    for (let i = 0; i < ring.length; i++) {
        const pt = ring[i];
        if (!Array.isArray(pt) || pt.length < 2) {
            return `Coordinate at index ${i} must be a [lng, lat] pair`;
        }
        const [lng, lat] = pt;
        if (typeof lng !== "number" || !Number.isFinite(lng) || typeof lat !== "number" || !Number.isFinite(lat)) {
            return `Coordinate at index ${i} must contain numeric longitude and latitude`;
        }
        if (lng < -180 || lng > 180) {
            return `Longitude at index ${i} must be between -180 and 180`;
        }
        if (lat < -90 || lat > 90) {
            return `Latitude at index ${i} must be between -90 and 90`;
        }
    }

    const first = ring[0];
    const last = ring[ring.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
        return "Polygon ring must be closed by repeating the first coordinate at the end";
    }

    const unique = new Set(ring.map((pt) => `${pt[0]},${pt[1]}`));
    if (unique.size < 4) {
        return "Polygon ring must contain at least 4 unique corners";
    }

    return null;
}

function validateName(name) {
    if (typeof name !== "string" || name.trim().length === 0) {
        return "Geofence name is required";
    }
    return null;
}


// CREATE
export const createGeofence = async (
    req,
    res,
    next
) => {

    try {

        const {
            name,
            coordinates
        } = req.body;

        if (
            !name ||
            !coordinates
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Name and coordinates are required"
            });
        }

        if (
            !Array.isArray(coordinates) ||
            coordinates.length === 0
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Coordinates must be a valid polygon"
            });
        }

        const nameError = validateName(name);
        if (nameError) {
            return res.status(400).json({
                success: false,
                message: nameError
            });
        }

        const coordinatesError = validateCoordinates(coordinates);
        if (coordinatesError) {
            return res.status(400).json({
                success: false,
                message: coordinatesError
            });
        }

        const geofence = await Geofence.create({
            name: name.trim(),
            coordinates
        });

        invalidateGeofenceCache();

        return res.status(201).json({
            success: true,
            message:
                "Geofence created successfully",
            data: geofence
        });

    } catch (error) {
        next(error);
    }
};


// GET ALL
export const getGeofences = async (
    req,
    res,
    next
) => {

    try {

        const geofences =
            await Geofence
                .find()
                .sort({
                    createdAt: -1
                });

        return res.status(200).json({
            success: true,
            count:
                geofences.length,
            data:
                geofences
        });

    } catch (error) {
        next(error);
    }
};


// GET ONE
export const getGeofenceById = async (
    req,
    res,
    next
) => {

    try {

        const { id } =
            req.params;

        if (
            !mongoose.Types
                .ObjectId
                .isValid(id)
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid geofence ID"
            });
        }

        const geofence =
            await Geofence.findById(id);

        if (!geofence) {
            return res.status(404).json({
                success: false,
                message:
                    "Geofence not found"
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


// UPDATE
export const updateGeofence = async (
    req,
    res,
    next
) => {

    try {

        const { id } =
            req.params;

        if (
            !mongoose.Types
                .ObjectId
                .isValid(id)
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid geofence ID"
            });
        }

        /*
         * Only update properties actually
         * included in the request.
         */
        const updateData = {};

        if (
            req.body.name !== undefined
        ) {
            updateData.name =
                req.body.name;
        }

        if (
            req.body.coordinates !== undefined
        ) {
            updateData.coordinates =
                req.body.coordinates;
        }

        if (
            req.body.status !== undefined
        ) {
            updateData.status =
                req.body.status;
        }

        const geofence =
            await Geofence.findByIdAndUpdate(
                id,
                updateData,
                {
                    new: true,
                    runValidators: true
                }
            );

        if (!geofence) {
            return res.status(404).json({
                success: false,
                message:
                    "Geofence not found"
            });
        }

        invalidateGeofenceCache();

        return res.status(200).json({
            success: true,
            message:
                "Geofence updated successfully",
            data:
                geofence
        });

    } catch (error) {
        next(error);
    }
};


// DELETE
export const deleteGeofence = async (
    req,
    res,
    next
) => {

    try {

        const { id } =
            req.params;

        if (
            !mongoose.Types
                .ObjectId
                .isValid(id)
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid geofence ID"
            });
        }

        const geofence =
            await Geofence.findByIdAndDelete(
                id
            );

        if (!geofence) {
            return res.status(404).json({
                success: false,
                message:
                    "Geofence not found"
            });
        }

        invalidateGeofenceCache();

        return res.status(200).json({
            success: true,
            message:
                "Geofence deleted successfully"
        });

    } catch (error) {
        next(error);
    }
};