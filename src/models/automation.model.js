import mongoose from "mongoose";

const automationSchema = new mongoose.Schema({
    device_name: {
        type: String, 
        required: true 
    },
    device_type: {
        type: String,
        enum: ['cleaning', 'kitchen', 'AC', 'fan', 'light', 'humidifier', "security"], 
        required: true,
        trim: true
    },
    status: {
        type: String,
        required: true,
        trim: true,
        default: false
    },
    startTime: {
        type: Date,
        required: true
    },
    endTime: {
        type: Date,
        required: true,
        validate: {
            validator: function (value) {
                return this.startTime ? value > this.startTime : true; // Ensure endTime is after startTime
            },
            message: "End time must be after start time"
        }
    }
});

const Automation = mongoose.model('Automation', automationSchema);
export default Automation;
