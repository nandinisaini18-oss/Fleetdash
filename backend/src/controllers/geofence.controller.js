import mongoose from "mongoose";

import Geofence from "../models/geofence.model.js";

import {
    invalidateGeofenceCache
} from "../services/geofence.service.js";


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

        const geofence =
            await Geofence.create({
                name,
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