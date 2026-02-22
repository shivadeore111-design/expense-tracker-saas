import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import routes from "./routes";
import { initDB } from "./database";

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get("/", (_req, res) => {
  res.send("Expense Tracker SaaS API running");
});

// Start server properly (async-safe)
async function startServer() {
  try {
    await initDB(); // Initialize database first

    app.use("/api", routes);

    const PORT = process.env.PORT || 3000;

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

startServer();