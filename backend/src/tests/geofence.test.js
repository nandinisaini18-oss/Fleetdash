import request from "supertest";
import mongoose from "mongoose";
import dotenv from "dotenv";
import app from "../src/app.js";
import Geofence from "../src/models/geofence.model.js";

dotenv.config();

let createdGeofenceId;

beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI);
});

afterAll(async () => {
    if (createdGeofenceId) {
        await Geofence.findByIdAndDelete(createdGeofenceId);
    }
    await mongoose.connection.close();
});

describe("Geofence API", () => {

    it("should reject geofence creation with missing fields", async () => {
        const res = await request(app)
            .post("/api/geofences")
            .send({ name: "Incomplete Zone" });

        expect(res.statusCode).toBe(400);
    });

    it("should create a new geofence", async () => {
        const res = await request(app)
            .post("/api/geofences")
            .send({
                name: `Test Zone ${Date.now()}`,
                coordinates: [[
                    [75.8, 22.7],
                    [75.9, 22.7],
                    [75.9, 22.8],
                    [75.8, 22.8],
                    [75.8, 22.7]
                ]]
            });

        expect(res.statusCode).toBe(201);
        expect(res.body.success).toBe(true);
        createdGeofenceId = res.body.data._id;
    });

    it("should fetch the created geofence by ID", async () => {
        const res = await request(app)
            .get(`/api/geofences/${createdGeofenceId}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.data._id).toBe(createdGeofenceId);
    });

    it("should return 404 for a non-existent geofence", async () => {
        const fakeId = new mongoose.Types.ObjectId();
        const res = await request(app).get(`/api/geofences/${fakeId}`);
        expect(res.statusCode).toBe(404);
    });

    it("should delete the geofence", async () => {
        const res = await request(app)
            .delete(`/api/geofences/${createdGeofenceId}`);

        expect(res.statusCode).toBe(200);
        createdGeofenceId = null;
    });

});