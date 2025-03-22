// server.js
import dotenv from 'dotenv';
import app from './app.js';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cron from 'node-cron';
import { connectDB, insertData, addPermissions } from './database/db.js';
import Device from './models/device.model.js';
import DeviceAutomation from './models/deviceAutomation.model.js'; 
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

        // For automation checks
        cron.schedule("* * * * *", async () => {
            console.log("[CRON] Checking automations...");

            const now = new Date();
            const currentHour = now.getHours();
            const currentMinute = now.getMinutes();

            try {
                // Fetch all device automations with linked devices and automations
                const deviceAutomations = await DeviceAutomation.find()
                    .populate('device_id')   // Get device details
                    .populate('automation_id'); // Get automation details (contains startTime & endTime)

                for (const deviceAutomation of deviceAutomations) {
                    if (!deviceAutomation.device_id || !deviceAutomation.automation_id) {
                        console.warn(`[CRON] Skipping automation (Missing device or automation: ${deviceAutomation._id})`);
                        continue;
                    }

                    const start = new Date(deviceAutomation.automation_id.startTime);
                    const end = deviceAutomation.automation_id.endTime ? new Date(deviceAutomation.automation_id.endTime) : null;

                    // Check if it's time to turn ON the device
                    if (start.getHours() === currentHour && start.getMinutes() === currentMinute) {
                        console.log(`[CRON] Turning ON ${deviceAutomation.device_type} (Device: ${deviceAutomation.device_id._id}) for house ${deviceAutomation.house_id}`);
                        await Device.updateOne(
                            { _id: deviceAutomation.device_id._id },
                            { $set: { status: true } }
                        );
                    }

                    // Check if it's time to turn OFF the device (only if endTime is set)
                    if (end && end.getHours() === currentHour && end.getMinutes() === currentMinute) {
                        console.log(`[CRON] Turning OFF ${deviceAutomation.device_type} (Device: ${deviceAutomation.device_id._id}) for house ${deviceAutomation.house_id}`);
                        await Device.updateOne(
                            { _id: deviceAutomation.device_id._id },
                            { $set: { status: false } }
                        );
                    }
                }
            } catch (error) {
                console.error("[CRON] Error processing automations:", error);
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
