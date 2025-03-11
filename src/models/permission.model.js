import mongoose from 'mongoose';

const permissionSchema = new mongoose.Schema({
    category: {
        type: String,
        trim: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    }
});

const Permission = mongoose.model('Permission', permissionSchema);
export default Permission;