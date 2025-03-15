import mongoose from "mongoose";
import role from './role.model.js'
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
        ref: role,
        required: true
    },
    parentUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
    user_avatar: {
        type: Number,
        default: 1
    }
});

const User = mongoose.model('User', userSchema);
export default User;
