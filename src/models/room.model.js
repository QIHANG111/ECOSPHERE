import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
    room_name: {
        type: String,
        required: true,
        trim: true
    },
    room_type: {
        type: String,
        required: true,
        trim: true
    },
    devices: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Device'
    }]
});

const Room = mongoose.model('Room', roomSchema);
export default Room;