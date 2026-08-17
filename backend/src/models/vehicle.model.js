import mongoose from "mongoose";

const vehicleSchema = new mongoose.Schema(
    {
        vehicleId: {
            type: String,
            required: true,
            unique: true,
            index: true
        },

        registrationNumber: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },

        driverName: {
            type: String,
            trim: true
        },

        status: {
            type: String,
            enum: ["active", "inactive", "maintenance"],
            default: "active",
            index: true
        },

        currentLocation: {
            latitude: {
                type: Number
            },
            longitude: {
                type: Number
            }
        },

        lastTelemetryAt: {
            type: Date
        }
    },
    {
        timestamps: true
    }
);

const Vehicle = mongoose.model("Vehicle", vehicleSchema);

export default Vehicle;