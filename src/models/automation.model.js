import mongoose from "mongoose";

const automationSchema = new mongoose.Schema({
    device_type: {
        type: String,
        enum: ['cleaning', 'kitchen', 'AC', 'fan', 'light', 'humidifier', "security"], 
        required: true,
        trim: true
    },
    status: {
        type: Boolean,
        required: true,
        trim: true,
        default: false
    },
    startTime: {
        type: Date,
        required: function () {
            return this.status;
        }
    },
    endTime: {
        type: Date,
        required: function() {
            return this.status;  
        },
        validate: {
            validator: function (value) {
                return this.startTime ? value > this.startTime : true; // Ensure endTime is after startTime
            },
            message: "End time must be after start time"
        }
    },
    house: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "House", 
        required: true,
        default: null
    }
});

const Automation = mongoose.model('Automation', automationSchema);
export default Automation;
