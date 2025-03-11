import mongoose from "mongoose";
import EnergyUsage from "./EnergyUsage.js";
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
});

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

const energySchema = new mongoose.Schema({
    device_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Device',
        required: true
    },
    recorded_at: {
        type: Date,
        default: Date.now
    },
    energy_consumed: {
        type: Number,
        required: true
    }
});

const roleSchema = new mongoose.Schema({
    role_name: {
        type: String,
        required: true,
        trim: true
    }
});

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

const rolePermissionSchema = new mongoose.Schema({
    role_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Role',
        required: true
    },
    permission_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Permission',
        required: true
    }
});



const User = mongoose.model('User', userSchema);
const Device = mongoose.model('Device', deviceSchema);
const Energy = mongoose.model('Energy', energySchema);
const Role = mongoose.model('Role', roleSchema);
const Permission = mongoose.model('Permission', permissionSchema);
const RolePermission = mongoose.model('RolePermission', rolePermissionSchema);

export default User;
