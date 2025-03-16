import mongoose from "mongoose";
import role from './role.model.js';
import permission from './permission.model.js';

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

const RolePermission = mongoose.model('RolePermission', rolePermissionSchema);
export default RolePermission;
