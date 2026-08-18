import express from "express";

import telemetryRoutes from "./routes/telemetry.routes.js";
import errorHandler from "./middlewares/errorHandler.js";
import vehicleRoutes from "./routes/vehicle.routes.js";

const app = express();

app.use(express.json());

// Health check
app.get("/api/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "FleetDash backend is running"
    });
});

// Telemetry routes
app.use("/api/telemetry", telemetryRoutes);
app.use("/api/vehicles", vehicleRoutes);

// Global error handler
app.use(errorHandler);

export default app;