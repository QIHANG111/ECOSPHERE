import mongoose from 'mongoose';

const houseSchema = new mongoose.Schema({
    house_name: {
        type: String,
        required: true,
        trim: true
    },
rooms: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room'
}]
});
const House = mongoose.model('House', houseSchema);
export default House;