process.removeAllListeners("warning");
process.on("warning", () => {});
import dotenv from "dotenv";
import http from "http";

import app from "./src/app.js";
import connectDB from "./src/database/db.js";

import startTelemetrySubscriber
    from "./src/services/telemetrySubscriber.service.js";

import {
    initializeSocket
} from "./src/services/socket.service.js";

dotenv.config();
    
const PORT =
    process.env.PORT || 3000;


const startServer = async () => {

    try {

        await connectDB();

        const httpServer =
            http.createServer(app);


        initializeSocket(
            httpServer
        );


        await startTelemetrySubscriber();


        httpServer.listen(
            PORT,
            () => {

                console.log(
                    `FleetDash server running on port ${PORT}`
                );

            }
        );

    } catch (error) {

        console.error(
            "Failed to start server:",
            error.message
        );

        process.exit(1);

    }

};

startServer();


