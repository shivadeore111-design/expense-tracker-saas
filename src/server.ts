import express from "express";
import cors from "cors";
import path from "path";
import { initDB } from "./database";
import routes from "./routes";

const app = express();

app.use(cors());
app.use(express.json());

// Serve frontend
app.use(express.static(path.join(__dirname, "../public")));

app.use("/api", routes);

app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

async function startServer() {
  try {
    await initDB();

    const PORT = process.env.PORT || 3000;

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Startup failed:", error);
    process.exit(1);
  }
}

startServer();