// server.js
import dotenv from 'dotenv';
import app from './app.js';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cron from 'node-cron';
import { connectDB, insertData, addPermissions } from './database/db.js';
import Device from './models/device.model.js';
dotenv.config();

const PORT = process.env.PORT || 4000;

async function startServer() {
    try {
        console.log('[DEBUG] Starting server...');

        // Connect to the database
        await connectDB();
        console.log('[DEBUG] Database connected successfully.');


        await insertData();
        await addPermissions();
        console.log('[DEBUG] Data inserted.');

        const server = http.createServer(app);
        const io = new SocketIOServer(server);

        //for device stop alerts, runs independently
        cron.schedule('* * * * *', async () => {
            const now = new Date();
            const updatedDevices = await Device.updateMany(
                { deviceType: { $in: ['cleaning', 'kitchen'] }, status: 'true', expectedStopTime: { $lte: now } },
                { $set: { status: 'false' } }
            );
            
            if (updatedDevices.modifiedCount > 0) {
                console.log(`[DEBUG] Auto-stopped ${updatedDevices.modifiedCount} cleaning/kitchen devices at ${now}`);
                io.emit('deviceStopped', { message: 'Your device has finished.' });
            }
        });

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
