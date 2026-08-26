import Piscina from "piscina";
import { fileURLToPath } from "url";

const pool = new Piscina({
    filename: fileURLToPath(
        new URL("../workers/telemetry.worker.js", import.meta.url)
    ),
    minThreads: 4,
    maxThreads: 8
});

export default pool;