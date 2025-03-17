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
    temperature: {//for AC 
        type: Number,
        required: function () {
            return this.device_type === "AC";
        },
        default: null //null for non-AC devices
    },
    brightness: {
        type: Number,
        min: 1,
        max: 5,
        required: function () {
            return this.device_type === "light"; // for lights
        },
        default: null //null for non-light devices
    }
});

const Device = mongoose.model('Device', deviceSchema);
export default Device;


