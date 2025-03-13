import express from "express";
import app from './app.js';
import dotenv from "dotenv";
import appRoutes from "./routes/appRoutes.js"
import { connectDB } from './database/db.js';
import { insertData } from './database/db.js';

dotenv.config();
app.use(express.json())

const PORT = process.env.PORT || 4000;

async function startServer() {
    try {
        await connectDB();
        console.log("Database connected. Setting up routes...");
        app.use(appRoutes); // Register routes after DB is connected
        app.listen(PORT, () => {
            console.log(`Server is running at http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("Error starting server:", error);
        process.exit(1);
    }
    await insertData();
}

startServer();