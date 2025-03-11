import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
    room_name: {
        type: String,
        required: true,
        trim: true
    },
    room_type: { //master, toilet, etc
        type: String,
        required: true,
        trim: true
    }
});

const Room = mongoose.model('Room', roomSchema);
export default Room;