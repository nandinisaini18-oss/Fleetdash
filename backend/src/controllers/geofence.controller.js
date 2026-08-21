import Geofence from "../models/geofence.model.js";

export const createGeofence = async (req, res, next) => {
    try {

        const {
            name,
            coordinates
        } = req.body;

        if (!name || !coordinates) {
            return res.status(400).json({
                success: false,
                message: "Name and coordinates are required"
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