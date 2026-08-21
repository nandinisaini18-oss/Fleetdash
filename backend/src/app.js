import express from "express";

import telemetryRoutes from "./routes/telemetry.routes.js";
import vehicleRoutes from "./routes/vehicle.routes.js";
import errorHandler from "./middlewares/errorHandler.js";

const app = express();

app.use(express.json());

// Health check
app.get("/api/health", (req, res) => {

    res.status(200).json({
        success: true,
        message: "FleetDash backend is running"
    });

});

// Telemetry
app.use(
    "/api/telemetry",
    telemetryRoutes
);

// Vehicles
app.use(
    "/api/vehicles",
    vehicleRoutes
);

// Global error handler
app.use(errorHandler);

export default app;