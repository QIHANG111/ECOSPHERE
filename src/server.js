// server.js
import dotenv from 'dotenv';
import app from './app.js';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { connectDB, insertData, addPermissions } from './database/db.js';

dotenv.config(); 

const PORT = process.env.PORT || 4000;

// Create HTTP server
const server = http.createServer(app);

// Create Socket.IO instance 
export const io = new SocketIOServer(server); 


async function startServer() {
    try {
        console.log('[DEBUG] Starting server...');

        // Connect to the database
        await connectDB();
        console.log('[DEBUG] Database connected successfully.');

        // Insert initial data
        await insertData();
        await addPermissions();
        console.log('[DEBUG] Data inserted.');

        // Import cron jobs AFTER io is available
        await import("./cronJobs.js");
        console.log('[DEBUG] Cron jobs initialized.');

        // Finally, start listening on the specified port
        app.listen(PORT, () => {
            console.log(`[DEBUG] Server is running at http://localhost:${PORT}`);
        });

    } catch (error) {
        console.error('[ERROR] Error starting server:', error);
        process.exit(1);
    }
}

startServer();
