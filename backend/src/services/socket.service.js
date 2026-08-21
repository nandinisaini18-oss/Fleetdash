import { Server } from "socket.io";

let io;

export const initializeSocket = (httpServer) => {

    io = new Server(httpServer, {
        cors: {
            origin: "*"
        }
    });

    io.on("connection", (socket) => {

        console.log(`Socket connected: ${socket.id}`);

        socket.on("disconnect", () => {
            console.log(`Socket disconnected: ${socket.id}`);
        });

    });

    console.log("Socket.io server initialized");

    return io;
};

export const getIO = () => {

    if (!io) {
        throw new Error("Socket.io has not been initialized");
    }

    return io;
};