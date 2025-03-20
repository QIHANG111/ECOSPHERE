import mongoose from "mongoose";
import role from './role.model.js'
import house from './house.model.js'

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    phone: {
        type: String,
        required: true,
        trim: true
    },
    hashed_password: {
        type: String,
        required: true,
        minlength: 6
    },
    role_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Role',
        required: true
    },
    parentUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    user_avatar: {
        type: Number,
        default: 1
    },
    group: {
        type: Number,
        default: 1
    },
    houses: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'House',
        default: []
    }
});

const User = mongoose.model('User', userSchema);
export default User;
