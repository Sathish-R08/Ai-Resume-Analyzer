import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.js";

// ✅ Load environment variables from parent folder (.env outside backend)
dotenv.config({ path: "../.env" });

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Port
const PORT = process.env.PORT || 5000;

// ✅ Get MongoDB URI from .env
const MONGODB_URI = process.env.MONGODB_URI;

// Debug (optional - remove later)
console.log("Mongo URI:", MONGODB_URI);

// ❌ If missing, stop server
if (!MONGODB_URI) {
    console.error("FATAL ERROR: MONGODB_URI is missing from .env");
    process.exit(1);
}

// ✅ Connect to MongoDB
mongoose.connect(MONGODB_URI)
    .then(() => {
        console.log("MongoDB Database Connected Successfully!");
    })
    .catch(err => {
        console.error("MongoDB Connection Failed:", err);
        process.exit(1);
    });

// Routes
app.use("/api/auth", authRoutes);

// Health check route
app.get("/api/health", (req, res) => {
    res.json({
        status: "ok",
        message: "AI Resume Backend is running smoothly "
    });
});

// Start server
app.listen(PORT, () => {
    console.log(` Server started on http://localhost:${PORT}`);
});