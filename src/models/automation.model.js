import mongoose from "mongoose";


const automationSchema = new mongoose.Schema({
    device_type: {
        type: String,
        enum: ['cleaning', 'kitchen', 'AC', 'light', 'humidifier', 'security'],
        required: true,
        trim: true
    },
    status: {
        type: Boolean,
        required: true,
        default: false
    },
    startTime: {
        type: Date
    },
    endTime: {
        type: Date
    },
    house: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "House",
        required: true
    }
});

// Custom validation (only on save/update)
automationSchema.pre('save', function (next) {
    if (this.status) {
        if (!this.startTime) {
            return next(new Error("Start time is required when automation is active"));
        }

        const isKitchenOrCleaning = ['cleaning', 'kitchen'].includes(this.device_type);
        if (!isKitchenOrCleaning && !this.endTime) {
            return next(new Error("End time is required when automation is active for non-cleaning/kitchen devices"));
        }

        if (this.endTime && this.startTime && this.endTime <= this.startTime) {
            return next(new Error("End time must be after start time"));
        }
    }
    next();
});
const Automation = mongoose.model('Automation', automationSchema);
export default Automation;
