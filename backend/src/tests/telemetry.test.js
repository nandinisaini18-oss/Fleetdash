import request from "supertest";
import mongoose from "mongoose";
import dotenv from "dotenv";
import app from "../app.js";
import Vehicle from "../models/vehicle.model.js";

dotenv.config();

let testVehicleId;

beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI);

    const vehicle = await Vehicle.create({
        vehicleId: `TELEMETRY-TEST-${Date.now()}`,
        registrationNumber: `REG-TT-${Date.now()}`,
        driverName: "Telemetry Test Driver"
    });

    testVehicleId = vehicle._id.toString();
});

afterAll(async () => {
    await Vehicle.findByIdAndDelete(testVehicleId);
    await mongoose.connection.close();
});

describe("Telemetry Ingestion API", () => {

    it("should reject telemetry with missing vehicleId", async () => {
        const res = await request(app)
            .post("/api/telemetry")
            .send({
                timestamp: new Date().toISOString(),
                latitude: 22.7,
                longitude: 75.8,
                speed: 40,
                heading: 90
            });

        expect(res.statusCode).toBe(400);
    });

    it("should reject telemetry with invalid latitude", async () => {
        const res = await request(app)
            .post("/api/telemetry")
            .send({
                vehicleId: testVehicleId,
                timestamp: new Date().toISOString(),
                latitude: 999,
                longitude: 75.8,
                speed: 40,
                heading: 90
            });

        expect(res.statusCode).toBe(400);
    });

    it("should reject telemetry for a non-existent vehicle", async () => {
        const fakeId = new mongoose.Types.ObjectId().toString();

        const res = await request(app)
            .post("/api/telemetry")
            .send({
                vehicleId: fakeId,
                timestamp: new Date().toISOString(),
                latitude: 22.7,
                longitude: 75.8,
                speed: 40,
                heading: 90
            });

        expect(res.statusCode).toBe(404);
    });

    it("should successfully ingest valid telemetry", async () => {
        const res = await request(app)
            .post("/api/telemetry")
            .send({
                vehicleId: testVehicleId,
                timestamp: new Date().toISOString(),
                latitude: 22.7,
                longitude: 75.8,
                speed: 40,
                heading: 90
            });

        expect(res.statusCode).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.vehicleId).toBe(testVehicleId);
    }, 15000);

});