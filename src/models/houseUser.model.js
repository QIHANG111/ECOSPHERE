import mongoose from 'mongoose';

const houseUserSchema = new mongoose.Schema({
    house_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'House',
        required: true
    },
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    role: {
        type: String,
        required: true,
        trim: true
    }
});

houseUserSchema.index({ house_id: 1, user_id: 1 }, { unique: true });

const HouseUser = mongoose.model('HouseUser', houseUserSchema);
export default HouseUser;
