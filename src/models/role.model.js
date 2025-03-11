import mongoose from 'mongoose';

const roleSchema = new mongoose.Schema({
    role_name: {
        type: String,
        required: true,
        trim: true
    }
});

const Role = mongoose.model('Role', roleSchema);
export default Role;