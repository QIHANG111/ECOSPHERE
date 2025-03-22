import cron from "node-cron";
import Device from "./models/device.model.js";
import DeviceAutomation from "./models/deviceAutomation.model.js";
import { io } from "./server.js";

// Device Stop Alert Cron Job (Runs every minute)
cron.schedule('* * * * *', async () => {
    console.log("[CRON] Checking devices for auto-stop...");

    const now = new Date();

    try {
        const updatedDevices = await Device.updateMany(
            { deviceType: { $in: ['cleaning', 'kitchen'] }, status: true, expectedStopTime: { $lte: now } },
            { $set: { status: false } }
        );

        if (updatedDevices.modifiedCount > 0) {
            console.log(`[CRON] Auto-stopped ${updatedDevices.modifiedCount} cleaning/kitchen devices at ${now}`);
            io.emit("deviceStopped", { 
                message: "Your device has finished." 
            });
        }
    } catch (error) {
        console.error("[CRON] Error auto-stopping devices:", error);
    }
});

// Automation Check Cron Job (Runs every minute)
cron.schedule("* * * * *", async () => {
    console.log("[CRON] Checking automations...");

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    try {
        // Fetch all device automations with linked devices and automations
        const deviceAutomations = await DeviceAutomation.find()
            .populate("device_id")    
            .populate("automation_id"); 

        for (const deviceAutomation of deviceAutomations) {
            if (!deviceAutomation.device_id || !deviceAutomation.automation_id) {
                console.warn(`[CRON] Skipping automation (Missing device or automation: ${deviceAutomation._id})`);
                continue;
            }

            const device = deviceAutomation.device_id;
            const automation = deviceAutomation.automation_id;

            const start = new Date(automation.startTime);
            const end = automation.endTime ? new Date(automation.endTime) : null;

            // Check if it's time to turn ON the device
            if (start.getHours() === currentHour && start.getMinutes() === currentMinute) {
                if (device.status !== true) { 
                    await Device.updateOne(
                        { _id: device._id },
                        { $set: { status: true } }
                    );
                    io.emit("deviceStatusUpdated", { 
                        device_id: device._id, 
                        status: true, 
                        message: "Device turned ON via automation" 
                    });
                    console.log(`[CRON] Turned ON ${deviceAutomation.device_type} (Device: ${device._id}) for house ${deviceAutomation.house_id}`);
                }
            }

            // Check if it's time to turn OFF the device (only if endTime is set)
            if (end && end.getHours() === currentHour && end.getMinutes() === currentMinute) {
                if (device.status !== false) {  
                    await Device.updateOne(
                        { _id: device._id },
                        { $set: { status: false } }
                    );
                    io.emit("deviceStatusUpdated", { 
                        device_id: device._id, 
                        status: false, 
                        message: "Device turned OFF via automation" 
                    });
                    console.log(`[CRON] Turned OFF ${deviceAutomation.device_type} (Device: ${device._id}) for house ${deviceAutomation.house_id}`);
                }
            }
        }
    } catch (error) {
        console.error("[CRON] Error processing automations:", error);
    }
});