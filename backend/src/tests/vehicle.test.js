import request from "supertest";
import mongoose from "mongoose";
import dotenv from "dotenv";
import app from "../src/app.js";
import Vehicle from "../src/models/vehicle.model.js";

dotenv.config();

beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI);
});

afterAll(async () => {
    await mongoose.connection.close();
});

describe("Vehicle API", () => {

    let createdVehicleId;

    it("should reject vehicle creation with missing fields", async () => {
        const res = await request(app)
            .post("/api/vehicles")
            .send({ driverName: "No ID Test" });

        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
    });

    it("should create a new vehicle", async () => {
        const uniqueId = `TEST-${Date.now()}`;

        const res = await request(app)
            .post("/api/vehicles")
            .send({
                vehicleId: uniqueId,
                registrationNumber: `REG-${Date.now()}`,
                driverName: "Jest Test Driver"
            });

        expect(res.statusCode).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.vehicleId).toBe(uniqueId);

        createdVehicleId = res.body.data._id;
    });

    it("should fetch the created vehicle by ID", async () => {
        const res = await request(app)
            .get(`/api/vehicles/${createdVehicleId}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.data._id).toBe(createdVehicleId);
    });

    it("should return 404 for a non-existent vehicle ID", async () => {
        const fakeId = new mongoose.Types.ObjectId();

        const res = await request(app)
            .get(`/api/vehicles/${fakeId}`);

        expect(res.statusCode).toBe(404);
    });

    afterAll(async () => {
        if (createdVehicleId) {
            await Vehicle.findByIdAndDelete(createdVehicleId);
        }
    });
});