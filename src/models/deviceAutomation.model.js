import mongoose from "mongoose";

const deviceAutomationSchema = new mongoose.Schema({
    device_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Device", 
        required: true 
    },
    device_type: { 
        type: String, 
        required: true, 
        enum: ['cleaning', 'kitchen', 'AC', 'fan', 'light', 'humidifier', "security"], 
    },
    house_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "House", 
        required: true 
    },
    automation_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Automation", 
        required: true 
    }
});

const DeviceAutomation = mongoose.model("DeviceAutomation", deviceAutomationSchema);
export default DeviceAutomation;``