import request from "supertest";
import mongoose from "mongoose";
import dotenv from "dotenv";
import app from "../app.js";

dotenv.config();

beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI);
});

afterAll(async () => {
    await mongoose.connection.close();
});

describe("Analytics API", () => {

    it("should return overview analytics", async () => {
        const res = await request(app).get("/api/analytics/overview");

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty("vehicles");
        expect(res.body.data).toHaveProperty("telemetry");
        expect(res.body.data).toHaveProperty("geofence");
    });

    it("should return vehicle analytics as an array", async () => {
        const res = await request(app).get("/api/analytics/vehicles");

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
    });

    it("should return telemetry analytics with totals", async () => {
        const res = await request(app).get("/api/analytics/telemetry");

        expect(res.statusCode).toBe(200);
        expect(res.body.data).toHaveProperty("totalBuckets");
    });

    it("should return geofence analytics as an array", async () => {
        const res = await request(app).get("/api/analytics/geofences");

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
    });

    it("should return system health status", async () => {
        const res = await request(app).get("/api/analytics/health");

        expect(res.statusCode).toBe(200);
        expect(res.body.data).toHaveProperty("mongoConnected");
    });

});