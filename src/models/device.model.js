import mongoose from 'mongoose';

const deviceSchema = new mongoose.Schema({
    device_name: {
        type: String,
        required: true,
        trim: true
    },
    device_type: {
        type: String,
        required: true,
        trim: true
    },
    status: {
        type: String,
        required: true,
        trim: true
    },
    energy_usage: {
        type: Map,
        of: Number,
        default: {} //"2025-03-15": 12.5
    },
    temperature: { // for AC
        type: Number,
        required: function () {
            return this.device_type === "AC";
        },
        default: null
    },
    brightness: {
        type: Number,
        min: 1,
        max: 5,
        required: function () {
            return this.device_type === "light";
        },
        default: null
    },
    room: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Room',
        required: true
    }
});

const Device = mongoose.model('Device', deviceSchema);
export default Device;