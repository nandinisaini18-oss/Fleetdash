import mongoose from "mongoose";

const telemetrySchema = new mongoose.Schema(
    {
        timestamp: {
            type: Date,
            required: true
        },

        latitude: {
            type: Number,
            required: true
        },

        longitude: {
            type: Number,
            required: true
        },

        speed: {
            type: Number,
            default: 0
        },

        heading: {
            type: Number,
            default: 0
        }
    },
    {
        _id: false
    }
);

const telemetryBucketSchema = new mongoose.Schema(
    {
        vehicleId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Vehicle",
            required: true,
            index: true
        },

        bucketStart: {
            type: Date,
            required: true,
            index: true
        },

        bucketEnd: {
            type: Date,
            required: true
        },

        telemetry: {
            type: [telemetrySchema],
            default: []
        },

        count: {
            type: Number,
            default: 0
        }
    },
    {
        timestamps: true
    }
);

telemetryBucketSchema.index({
    vehicleId: 1,
    bucketStart: 1
});

const TelemetryBucket = mongoose.model(
    "TelemetryBucket",
    telemetryBucketSchema
);

export default TelemetryBucket;