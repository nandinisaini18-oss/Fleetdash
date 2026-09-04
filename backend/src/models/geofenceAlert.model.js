import mongoose from "mongoose";

const geofenceAlertSchema = new mongoose.Schema(
    {
        vehicleId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Vehicle",
            required: true,
            index: true
        },

        geofenceId: {
            type: mongoose.Schema.Types.ObjectId,
            
            ref: "Geofence",
            required: true,
            index: true
        },

        type: {
            type: String,
            enum: ["ENTRY", "EXIT"],
            required: true
        },

        timestamp: {
            type: Date,
            required: true,
            index: true
        },

        latitude: {
            type: Number,
            required: true
        },

        longitude: {
            type: Number,
            required: true
        }
    },
    {
        timestamps: true
    }
);

geofenceAlertSchema.index({
    vehicleId: 1,
    geofenceId: 1,
    timestamp: -1
});

const GeofenceAlert = mongoose.model(
    "GeofenceAlert",
    geofenceAlertSchema
);

export default GeofenceAlert;