import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
    room_name: {
        type: String,
        required: true,
        trim: true
    },
    devices: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Device'
    }],
    house: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'House'
    }    
});

const Room = mongoose.model('Room', roomSchema);
export default Room;