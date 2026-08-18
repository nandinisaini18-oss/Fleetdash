import { Worker } from "worker_threads";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const workerPath = path.join(
    __dirname,
    "../workers/telemetryWorker.js"
);

const processTelemetry = (telemetryData) => {
    return new Promise((resolve, reject) => {

        const worker = new Worker(workerPath, {
            workerData: null
        });

        worker.postMessage(telemetryData);

        worker.on("message", (result) => {
            if (result.success) {
                resolve(result.data);
            } else {
                reject(new Error(result.error));
            }

            worker.terminate();
        });

        worker.on("error", (error) => {
            reject(error);
            worker.terminate();
        });

        worker.on("exit", (code) => {
            if (code !== 0) {
                reject(
                    new Error(`Worker stopped with exit code ${code}`)
                );
            }
        });
    });
};

export default processTelemetry;