import mongoose from "mongoose";

const geofenceSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        coordinates: {
            type: [[[Number]]],
            required: true
        },

        status: {
            type: String,
            enum: ["active", "inactive"],
            default: "active"
        }
    },
    {
        timestamps: true
    }
);

const Geofence = mongoose.model(
    "Geofence",
    geofenceSchema
);

export default Geofence;