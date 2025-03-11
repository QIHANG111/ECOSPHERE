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
    }
});

const Device = mongoose.model('Device', deviceSchema);
export default Device;

