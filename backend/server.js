import dotenv from "dotenv";
import app from "./src/app.js";
import connectDB from "./src/database/db.js";
import startTelemetrySubscriber from "./src/services/telemetrySubscriber.service.js";

dotenv.config();

const PORT = process.env.PORT || 3000;

const startServer = async () => {
    try {
        await connectDB();

        app.listen(PORT, () => {
            console.log(`FleetDash server running on port ${PORT}`);
        });
    } catch (error) {
        console.error("Failed to start server:", error.message);
        process.exit(1);
    }
};

startServer();
await startTelemetrySubscriber();