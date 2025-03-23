import express from 'express';
import EnergyUsage from '../models/energy.model.js';
import User from '../models/user.model.js';
import Device from '../models/device.model.js';
import bcrypt from 'bcryptjs';
import Room from '../models/room.model.js';
import House from '../models/house.model.js';
import mongoose from 'mongoose';
import Role from '../models/role.model.js'
import RolePermission from '../models/rolePermission.model.js';
import jwt from 'jsonwebtoken';
import { error } from 'node:console';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import path from 'node:path';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import HouseUser from '../models/houseUser.model.js';
import Automation from '../models/automation.model.js';
import { insertDefaultAutomations } from '../database/db.js';
import DeviceAutomation from '../models/deviceAutomation.model.js';


dotenv.config();
const SECRET_KEY = process.env.SECRET_KEY;

// If you're using JWT, make sure to import it:
// import jwt from 'jsonwebtoken';
// And have SECRET_KEY either from env or config

/*notes
-build automation APIs - update permission status-automation model
-factory reset(extra time)  
-forget password finish
*/

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


const router = express.Router();
let notifications = [];

/* ------------------------------------------------------------
   Debugging Helper: log the Mongoose connection state
   0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
-------------------------------------------------------------*/
function logDbState(routeLabel) {
    const state = mongoose.connection.readyState;
    console.log(`[DEBUG] [${routeLabel}] Mongoose connection state: ${state}`);
}

/*
  Serve the main HTML page at "/"
*/
router.get('/', (req, res) => {
    console.log('[DEBUG] GET / -> sending homePage.html');
    res.sendFile(path.join(__dirname, '../public/pages/landingPage.html'));
});

/*
  Sign up:
  - Automatically assigns the "Home Owner" role.
  - Creates a house for the new user.
  - Inserts a mapping in the HouseUser collection.
  - Updates the user's houses array with the new house ID.
*/
router.post('/api/signup', async (req, res) => {
    try {
        let { name, email, phone, password, parentUser, user_avatar } = req.body;
        if (!phone) phone = "1234567890";
        if (typeof user_avatar === "undefined" || user_avatar === null) user_avatar = 1;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "Email already registered" });
        }

        // Automatically assign the "Home Owner" role
        const role = await Role.findOne({ role_name: "Home Owner" });
        if (!role) {
            return res.status(500).json({ message: "Home Owner role not found" });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user with the "Home Owner" role
        const newUser = new User({
            name,
            email,
            phone,
            hashed_password: hashedPassword,
            role_id: role._id,
            parentUser: parentUser || null,
            user_avatar,
            houses: []
        });
        await newUser.save();

        // Automatically create a house for the new Home Owner.
        const houseName = `${newUser.name}'s House`;
        const newHouse = new House({
            house_name: houseName,
            rooms: [],
            owners: [newUser._id],
            dwellers: []
        });
        await newHouse.save();

        //insert automation rules
        await insertDefaultAutomations(newHouse._id);

        // Insert mapping into the HouseUser collection
        const houseUserMapping = new HouseUser({
            house_id: newHouse._id,
            user_id: newUser._id,
            role: "Home Owner"
        });
        await houseUserMapping.save();

        // Update the user's houses array with the new house ID
        newUser.houses.push(newHouse._id);
        await newUser.save();

        // Generate JWT token
        const token = jwt.sign(
            { userId: newUser._id, email: newUser.email, role: newUser.role_id },
            SECRET_KEY,
        );
        console.log('token generated: ', token)

        res.status(201).json({ message: "User registered successfully", token, data: newUser });
    } catch (error) {
        console.error("[ERROR] POST /api/signup ->", error);
        res.status(500).json({ message: "Server error" });
    }
});

router.get('/api/getRoleId/:roleName', async (req, res) => {
    try {
        const roleName = req.params.roleName;
        console.log(`[DEBUG] Fetching role_id for: ${roleName}`); 

        const role = await Role.findOne({ role_name: roleName });

        if (!role) {
            console.log("[ERROR] Role not found");
            return res.status(404).json({ message: "Role not found" });
        }

        console.log(`[DEBUG] Found role_id: ${role._id}`);
        res.json({ role_id: role._id });
    } catch (error) {
        console.error("[ERROR] Fetching role ID:", error);
        res.status(500).json({ message: "Server error" });
    }
});

/*
  Sign in:
*/
router.post('/api/signin', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }

        const isMatch = await bcrypt.compare(password, user.hashed_password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Incorrect password' });
        }

        const token = jwt.sign(
            { userId: user._id, email: user.email, role: user.role_id },
            SECRET_KEY,
            { expiresIn: '2h' }
        );

        res.status(200).json({ message: 'Sign in successfully', token, user });
    } catch (error) {
        console.error('[ERROR] POST /api/signin ->', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/*
  Get authenticated user details:
*/
router.get('/api/user', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) return res.status(401).json({ message: "Unauthorized" });
        const decoded = jwt.verify(token, SECRET_KEY);
        const userId = decoded.userId;

        const user = await User.findById(userId)
            .select("name email phone role_id user_avatar houses")
            .populate("role_id", "role_name")
            .populate("houses", "house_name");

        if (!user) return res.status(404).json({ message: "User not found" });
        res.json(user);
    } catch (error) {
        console.error("[ERROR] GET /api/user ->", error);
        res.status(500).json({ message: "Server error" });
    }
});

/*
  Forgot password recovery option
*/
router.post('/api/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        console.log(`[DEBUG] POST /api/forgot-password -> Received email: ${email}`);

        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            console.warn(`[DEBUG] No account found for email: ${email}`);
            // Always return success to avoid revealing whether the email exists
            return res.status(200).json({ message: "If an account with that email exists, a reset link has been sent." });
        }

        // Generate a reset token valid for 1 hour
        const token = jwt.sign({ userId: user._id }, process.env.SECRET_KEY, { expiresIn: '1h' });
        console.log(`[DEBUG] Generated reset token: ${token}`);

        // Construct the reset link
        const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
        console.log(`[DEBUG] Generated reset link: ${resetLink}`);

        // Set up nodemailer transporter
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT),
            secure: process.env.SMTP_SECURE === 'true', // true for port 465, false for others
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });

        // Define the email options
        const mailOptions = {
            from: `"Your App Name" <${process.env.SMTP_USER}>`,
            to: email,
            subject: "Password Reset Request",
            text: `You requested a password reset. Click the link below to reset your password:\n\n${resetLink}\n\nIf you did not request this, please ignore this email.`,
            html: `
                <p>You requested a password reset. Click the link below to reset your password:</p>
                <p><a href="${resetLink}">${resetLink}</a></p>
                <p>If you did not request this, please ignore this email.</p>
            `
        };

        // Send the email
        await transporter.sendMail(mailOptions);
        console.log(`[DEBUG] Password reset email sent to ${email}`);

        return res.status(200).json({
            message: "If an account with that email exists, a reset link has been sent."
        });
    } catch (error) {
        console.error(`[ERROR] POST /api/forgot-password ->`, error);
        return res.status(500).json({ message: "Server error" });
    }
});

/*
  Helper function to checkPermissions in the rolePermission map
*/
const checkPermission = async (userId, permissionName) => {
    try {
        const user = await User.findById(userId).populate("role_id");
        if (!user || !user.role_id) {
            console.warn("[WARN] Invalid user or role_id:", userId);
            return false;
        }

        console.log(`[DEBUG] Checking permission "${permissionName}" for user: ${user.name}, role: ${user.role_id.role_name}`);

        const rolePermissions = await RolePermission.find({ role_id: user.role_id._id }).populate("permission_id");

        console.log("[DEBUG] Role Permissions for role:", user.role_id.role_name);
        rolePermissions.forEach(rp => {
            console.log(" -", rp.permission_id?.name);
        });

        const hasPermission = rolePermissions.some(rp => rp.permission_id?.name === permissionName);
        console.log(`[RESULT] hasPermission = ${hasPermission}`);
        return hasPermission;
    } catch (error) {
        console.error("[ERROR] checkPermission ->", error);
        return false;
    }
};

//fortest
router.get('/api/has-permission', async (req, res) => {
    try {
        const { userId, permissionName } = req.query;

        if (!userId || !permissionName) {
            return res.status(400).json({ error: "userId and permissionName are required" });
        }

        const has = await checkPermission(userId, permissionName);
        res.json({
            success: true,
            userId,
            permission: permissionName,
            hasPermission: has
        });
    } catch (error) {
        console.error("[ERROR] /api/has-permission ->", error);
        res.status(500).json({ error: "Server Error" });
    }
});
/* ============================================================
   USER CONFIG
============================================================ */

/*
  Update authenticated user details:
*/
router.put('/api/update-user', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) return res.status(401).json({ message: "Unauthorized" });
        const decoded = jwt.verify(token, SECRET_KEY);
        const userId = decoded.userId;

        const { name, email, password, user_avatar } = req.body;
        let updateData = {};
        if (name) updateData.name = name;
        if (email) updateData.email = email;
        if (password) {
            updateData.hashed_password = await bcrypt.hash(password, 10);
        }
        if (typeof user_avatar === "number") {
            updateData.user_avatar = user_avatar;
        }

        const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true });
        if (!updatedUser) return res.status(404).json({ message: "User not found" });
        res.json({ message: "User updated successfully", user: updatedUser });
    } catch (error) {
        console.error("[ERROR] PUT /api/update-user ->", error);
        res.status(500).json({ message: "Server error" });
    }
});

/*
  Add new sub-user (e.g., Home Dweller):
  - Inherits parent's email and hashed password.
  - Creates a new user with the specified role.
  - Maps the sub-user to the parent's house via HouseUser.
*/
router.post('/api/subusers', async (req, res) => {
    try {
        const { name, phone, parentEmail, role: roleName, user_avatar } = req.body;
        if (!name || !phone || !parentEmail || !roleName) {
            return res.status(400).json({
                success: false,
                message: 'Please provide name, phone, parentEmail, and role'
            });
        }

        const mainUser = await User.findOne({ email: parentEmail });
        if (!mainUser) {
            return res.status(400).json({ success: false, message: 'Parent user not found' });
        }

        const roleDoc = await Role.findOne({ role_name: roleName });
        if (!roleDoc) {
            return res.status(500).json({ success: false, message: `Role "${roleName}" not found` });
        }

        const newSubUser = new User({
            name,
            phone,
            email: mainUser.email,
            hashed_password: mainUser.hashed_password,
            role_id: roleDoc._id,
            parentUser: mainUser._id,
            user_avatar
        });
        await newSubUser.save();

        const mainHouseMapping = await HouseUser.findOne({ user_id: mainUser._id, role: "Home Owner" });
        if (mainHouseMapping) {
            const subUserMapping = new HouseUser({
                house_id: mainHouseMapping.house_id,
                user_id: newSubUser._id,
                role: roleName
            });
            await subUserMapping.save();
        }

        res.status(201).json({ success: true, message: 'Sub-user created successfully', data: newSubUser });
    } catch (error) {
        console.error('[ERROR] POST /api/subusers ->', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

/*
  Delete user by ID:
  - If the user is a manager ("Home Owner"), also deletes associated sub-users and the owned house.
  - For sub-users or other roles, deletes only the user and removes their HouseUser mapping.
*/
router.delete('/api/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userToDelete = await User.findById(id).populate("role_id", "role_name");
        if (!userToDelete) return res.status(404).json({ success: false, message: 'User not found' });

        if (userToDelete.role_id.role_name === "Home Owner") {
            const usersToDelete = await User.find({
                $or: [{ _id: id }, { parentUser: id }]
            }).select('_id');
            const idsToDelete = usersToDelete.map(u => u._id);

            await User.deleteMany({ _id: { $in: idsToDelete } });
            await HouseUser.deleteMany({ user_id: { $in: idsToDelete } });
            await House.deleteMany({ owners: id });

            return res.status(200).json({
                success: true,
                message: 'Manager, all associated sub-users, and registered houses have been deleted.'
            });
        } else {
            await User.findByIdAndDelete(id);
            await HouseUser.deleteMany({ user_id: id });
            return res.status(200).json({ success: true, message: 'User has been deleted.' });
        }
    } catch (error) {
        console.error('[ERROR] DELETE /api/users/:id ->', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

/*
  Get all sub-users under a certain parent user
*/
router.get('/api/users/parent/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const parentUser = await User.findById(id);
        if (!parentUser) return res.status(404).json({ success: false, message: "Parent user not found" });

        const subUsers = await User.find({ parentUser: id }).populate("role_id", "role_name");
        res.status(200).json({ success: true, parent: parentUser, subUsers });
    } catch (error) {
        console.error("[ERROR] GET /api/users/parent/:id ->", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

/*
  Get all users from mongodb (developer view)
*/
router.get('/api/allusers', async (req, res) => {
    try {
        const users = await User.find();
        res.status(200).json({ success: true, users });
    } catch (error) {
        console.error('[ERROR] GET /api/allusers ->', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

/*
  Assign role to a user
*/

//only home owner can see the chage role button so dont need to check permission for this function
router.post('/api/users/:userId/assign-role', async (req, res) => {
    try {
        const { userId } = req.params;
        const { roleId } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const role = await Role.findById(roleId);
        if (!role) {
            return res.status(404).json({ error: "Role not found" });
        }

        user.role_id = roleId;
        await user.save();

        res.json({ message: "Role assigned successfully", user });
    } catch (error) {
        res.status(500).json({ error: "Failed to assign role" });
    }
});
/* ============================================================
   DEVICES CONFIG
============================================================ */

/*
  Add Device
  - Creates a new device.
  - If a roomName is provided, it finds the room and:
      • Adds the device's ID to the room's devices array.
      • Updates the device's room reference.
*/
router.post('/api/device', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) return res.status(401).json({ error: "Unauthorized" });

        const decoded = jwt.verify(token, SECRET_KEY);
        const userId = decoded.userId;

        const { device_name, device_type, ...rest } = req.body;

        if (!device_name || !device_type) {
            return res.status(400).json({
                error: "Missing required fields (device_name and device_type)"
            });
        }

        const user = await User.findById(userId);
        if (!user || !user.houses || user.houses.length === 0) {
            return res.status(400).json({ error: "User is not associated with any house" });
        }

        const houseId = user.houses[0];

        let room = await Room.findOne({ house: houseId });
        if (!room) {
            room = new Room({
                room_name: "Default Room",
                house: houseId,
                devices: []
            });
            await room.save();
            console.log(`[DEBUG] Created default room "${room.room_name}" for house ${houseId}`);

            await House.findByIdAndUpdate(
                houseId,
                { $addToSet: { rooms: room._id } }
            );
            console.log(`[DEBUG] Added default room ID ${room._id} to house ${houseId}`);
        }

        const newDevice = new Device({
            device_name,
            device_type,
            room: room._id,
            house: houseId,
            ...rest
        });

        await newDevice.save();

        const automation = await Automation.findOne({ device_type, house: houseId });

        if (!automation) {
            return res.status(400).json({ error: "No automation rule found for this device type." });
        }

        // Create mapping from device to automation
        await DeviceAutomation.create({ device_id: newDevice._id, device_type, house_id: houseId, automation_id: automation._id });
        console.log(`[DEBUG] Created automation mapping for "${newDevice.device_name}" for house ${houseId}`);

        room.devices.push(newDevice._id);
        await room.save();

        res.status(201).json({
            success: true,
            message: "Device created and assigned to room",
            data: newDevice
        });

    } catch (error) {
        console.error("[ERROR] POST /api/device ->", error);
        res.status(500).json({ error: "Server error" });
    }
});

/*
  Delete Device
  - Checks if the requesting user has "deleteDevice" permission.
  - Removes the device from the associated room's devices array if applicable.
  - Deletes the device document.
*/
router.delete('/api/device/:id', async (req, res) => {
    console.log('[DEBUG] DELETE /api/device/:id ->', req.params);
    const { id } = req.params;

    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) {
            console.log('[DEBUG] Missing Authorization header');
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const decoded = jwt.verify(token, SECRET_KEY);
        const userId = decoded.userId;

        if (!userId) {
            console.log('[DEBUG] Invalid token: missing userId');
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const hasPermission = await checkPermission(userId, "deleteDevice");
        if (!hasPermission) {
            console.log(`[DEBUG] Permission denied for user ${userId}`);
            return res.status(403).json({ success: false, message: 'Permission denied' });
        }

        const device = await Device.findById(id);
        if (!device) {
            console.error(`[ERROR] Device not found with id: ${id}`);
            return res.status(404).json({ error: 'Device not found' });
        }

        // Remove device from room
        if (device.room) {
            const room = await Room.findById(device.room);
            if (room) {
                room.devices = room.devices.filter(devId => devId.toString() !== id);
                await room.save();
                console.log(`[DEBUG] Removed device ${id} from room "${room.room_name}"`);
            }
        }

        // Delete mappings in DeviceAutomation (not Automation directly)
        await DeviceAutomation.deleteMany({ device_id: device._i });
        console.log(`[DEBUG] Automations deleted for device ${device.device_name} `);

        await Device.findByIdAndDelete(id);
        console.log(`[DEBUG] Deleted device with id: ${id}`);
        res.status(200).json({ success: true, message: 'Device deleted successfully' });
        

    } catch (error) {
        console.error('[ERROR] DELETE /api/device/:id ->', error);
        res.status(500).json({ error: 'Server Error' });
    }
});
/*
  Get All Devices from the database.
*/
router.get('/api/devices', async (req, res) => {
    console.log('[DEBUG] GET /api/devices -> Fetching devices');
    try {
        const devices = await Device.find();
        if (!devices || devices.length === 0) {
            console.error('[ERROR] No devices found');
            return res.status(404).json({ error: 'No devices found' });
        }
        console.log(`[DEBUG] Found ${devices.length} devices`);
        res.json(devices);
    } catch (error) {
        console.error('[ERROR] GET /api/devices ->', error);
        res.status(500).json({ error: 'Server error while fetching devices' });
    }
});

/*
  Update Device Status
*/
router.post('/api/update-device', async (req, res) => {
    console.log('[DEBUG] POST /api/update-device -> req.body:', req.body);
    if (!req.body || typeof req.body.name !== 'string' || (typeof req.body.status !== 'boolean' && req.body.status !== "true" && req.body.status !== "false")) {
        console.error('[ERROR] Invalid request body for update-device');
        return res.status(400).json({ error: "Invalid request format. 'name' must be a string and 'status' must be a boolean or valid string ('true'/'false')." });
    }
    const { name, status } = req.body;
    const statusValue = status === "true" || status === true;

    try {
        const updatedDevice = await Device.findOneAndUpdate(
            { device_name: name },
            { status: statusValue },
            { new: true }
        );
        if (!updatedDevice) {
            console.log(`[DEBUG] Device not found with name: ${name}`);
            return res.status(404).json({ error: 'Device not found' });
        }
        console.log(`[DEBUG] Updated device '${name}' status to: ${statusValue}`);
        res.json({ success: true, updatedDevice });
    } catch (error) {
        console.error('[ERROR] POST /api/update-device ->', error);
        res.status(500).json({ error: 'Server error while updating device status' });
    }
});

/*
  Update Temperature for an AC Device
*/
router.post('/api/update-temperature', async (req, res) => {
    console.log('[DEBUG] POST /api/update-temperature -> req.body:', req.body);
    if (!req.body || typeof req.body.name !== 'string' || typeof req.body.temperature !== 'number') {
        console.error('[ERROR] Invalid request format for update-temperature');
        return res.status(400).json({
            error: "Invalid request format. 'name' must be a string and 'temperature' must be a number."
        });
    }
    const { name, temperature } = req.body;
    try {
        const updatedDevice = await Device.findOneAndUpdate(
            { device_name: name, device_type: 'AC' },
            { temperature: temperature },
            { new: true }
        );
        if (!updatedDevice) {
            console.error(`[ERROR] AC device not found with name: ${name}`);
            return res.status(404).json({ error: 'AC device not found' });
        }
        console.log(`[DEBUG] Updated AC device '${name}' temperature to: ${temperature}`);
        res.json({ success: true, updatedDevice });
    } catch (error) {
        console.error('[ERROR] POST /api/update-temperature ->', error);
        res.status(500).json({ error: 'Server error while updating temperature' });
    }
});

/*
  Adjust Light Brightness
*/
router.put("/api/devices/:id/adjust-brightness", async (req, res) => {
    try {
        const { brightness } = req.body;
        const deviceId = req.params.id;
        console.log(`[DEBUG] Adjust brightness for device ID: ${deviceId} to ${brightness}`);

        if (brightness < 1 || brightness > 5) {
            console.error('[ERROR] Brightness level out of range');
            return res.status(400).json({ error: "Brightness level must be between 1 and 5" });
        }
        const device = await Device.findById(deviceId);
        if (!device) {
            console.error('[ERROR] Device not found for brightness adjustment');
            return res.status(404).json({ error: "Device not found" });
        }
        if (device.device_type !== "light") {
            console.error("[ERROR] Device is not a light");
            return res.status(400).json({ error: "This device is not a light" });
        }
        device.brightness = brightness;
        await device.save();
        console.log(`[DEBUG] Brightness for device ${device.device_name} updated to ${brightness}`);
        res.status(200).json({ success: true, message: "Brightness adjusted successfully", data: device });
    } catch (error) {
        console.error("[ERROR] PUT /api/devices/:id/adjust-brightness ->", error);
        res.status(500).json({ error: "Server error" });
    }
});

/*
  Get Devices for a House
*/
router.get('/api/houses/:houseId/devices', async (req, res) => {
    try {
        const { houseId } = req.params;
        console.log(`[DEBUG] GET /api/houses/${houseId}/devices -> Fetching devices for house`);
        const house = await House.findById(houseId);
        if (!house) {
            console.error(`[ERROR] House not found: ${houseId}`);
            return res.status(404).json({ success: false, message: "House not found" });
        }
        if (!house.rooms || house.rooms.length === 0) {
            console.log(`[DEBUG] No rooms in house: ${houseId}`);
            return res.status(200).json({ success: true, devices: [] });
        }
        const devices = await Device.find({ room: { $in: house.rooms } }).populate('room', 'room_name');
        console.log(`[DEBUG] Found ${devices.length} devices in house ${houseId}`);
        res.status(200).json({ success: true, devices });
    } catch (error) {
        console.error(`[ERROR] GET /api/houses/:houseId/devices ->`, error);
        res.status(500).json({ success: false, message: "Server error while fetching house devices" });
    }
});

/*
  Get Device Status by ID
*/
router.get("/api/device/status/:id", async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`[DEBUG] GET /api/device/status/${id} -> Fetching device status`);
        const device = await Device.findById(id).select("status");
        if (!device) {
            console.error(`[ERROR] Device not found: ${id}`);
            return res.status(404).json({ error: "Device not found" });
        }
        console.log(`[DEBUG] Device status for ${id}: ${device.status}`);
        res.status(200).json({ success: true, status: device.status });
    } catch (error) {
        console.error(`[ERROR] GET /api/device/status/:id ->`, error);
        res.status(500).json({ error: "Server error" });
    }
});

/*
  Adjust Fan Speed
*/
router.put("/api/devices/:id/fan-speed", async (req, res) => {
    try {
        const { fanSpeed } = req.body;
        const deviceId = req.params.id;
        console.log(`[DEBUG] PUT /api/devices/${deviceId}/fan-speed -> Received fanSpeed: ${fanSpeed}`);
        if (typeof fanSpeed !== "number" || fanSpeed < 1 || fanSpeed > 8) {
            console.error("[ERROR] Invalid fan speed value");
            return res.status(400).json({ error: "Fan speed must be between 1 and 8" });
        }
        const device = await Device.findById(deviceId);
        if (!device) {
            console.error(`[ERROR] Device not found: ${deviceId}`);
            return res.status(404).json({ error: "Device not found" });
        }
        if (device.device_type !== "fan") {
            console.error(`[ERROR] Device ${deviceId} is not a fan`);
            return res.status(400).json({ error: "This device is not a fan" });
        }
        device.fan_speed = fanSpeed;
        await device.save();
        console.log(`[DEBUG] Device ${deviceId} fan speed updated to ${device.fan_speed}`);
        res.status(200).json({ success: true, message: "Fan speed updated successfully", data: device });
    } catch (error) {
        console.error(`[ERROR] PUT /api/devices/:id/fan-speed ->`, error);
        res.status(500).json({ success: false, message: "Server error while updating fan speed" });
    }
});

/*
  start/auto stop cleaning and kitchen devices
*/
router.post('/api/devices/:deviceId/start', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) {
            console.warn('[WARNING] No token provided');
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        let decoded;
        try {
            decoded = jwt.verify(token, SECRET_KEY);
        } catch (err) {
            console.error('[ERROR] Invalid token:', err);
            return res.status(401).json({ success: false, message: 'Invalid token' });
        }
        const userId = decoded.userId;
        console.log(`[DEBUG] Authenticated user: ${userId}`);

        const { deviceId } = req.params;
        const { durationInMinutes } = req.body; 

        if (!durationInMinutes || isNaN(durationInMinutes)) {
            return res.status(400).json({ success: false, message: 'Valid duration in minutes is required' });
        }

        const device = await Device.findById(deviceId);
        if (!device) {
            return res.status(404).json({ success: false, message: 'Device not found' });
        }

        if (device.device_type !== 'cleaning' && device.device_type !== 'kitchen') {
            return res.status(400).json({ success: false, message: 'This device type does not support start/auto-stop' });
        }

        const startTime = new Date();
        const expectedStopTime = new Date(startTime.getTime() + durationInMinutes * 60000);

        device.status = 'true';
        device.startTime = startTime;
        device.expectedStopTime = expectedStopTime;
        device.duration = durationInMinutes; 

        await device.save();
        console.log(`[DEBUG] Device ${deviceId} (${device.device_type}) started at ${startTime}, expected to stop at ${expectedStopTime}`);

        setTimeout(async () => {
            const currentDevice = await Device.findById(deviceId);
            if (currentDevice && currentDevice.status === 'true') {
                currentDevice.status = 'false';
                await currentDevice.save();
                console.log(`[DEBUG] Device ${deviceId} auto-stopped at ${new Date()}`);
            }
        }, durationInMinutes * 60000);

        res.status(201).json({ success: true, message: 'Device started', data: { deviceId, startTime, expectedStopTime, durationInMinutes } });
    } catch (error) {
        console.error('[ERROR] Starting device ->', error);
        res.status(500).json({ success: false, message: 'Failed to start device' });
    }
});

/* ============================================================
   HOUSE CONFIG
============================================================ */

/*
  Add house to house collection, create new houseUser mapping for owners, add to user doc, and add automation rules
*/
router.post('/api/houses', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const decoded = jwt.verify(token, SECRET_KEY);
        const userId = decoded.userId;

        const { house_name } = req.body;
        if (!house_name) {
            return res.status(400).json({ success: false, message: "House name is required" });
        }

        const user = await User.findById(userId).populate("role_id");
        if (!user || user.role_id?.role_name !== "Home Owner") {
            return res.status(403).json({ success: false, message: "Only Home Owners can create houses" });
        }


        const newHouse = new House({
            house_name,
            owners: [userId],
            rooms: [],
            dwellers: []
        });
        await newHouse.save();
        console.log(`[DEBUG] House created: ${newHouse._id} (${house_name})`);
        await insertDefaultAutomations(newHouse._id);
        console.log(`[DEBUG] Automation rules inserted to: (${house_name})`);


        const houseUser = new HouseUser({
            house_id: newHouse._id,
            user_id: userId,
            role: "Home Owner"
        });
        await houseUser.save();

        user.houses.push(newHouse._id);
        await user.save();
        return res.status(201).json({
            success: true,
            message: "House created successfully",
            house: newHouse.toObject()
        });

    } catch (error) {
        console.error("[ERROR] Creating house ->", error);
        res.status(500).json({ success: false, message: "Failed to create house" });
    }
});
/*
  Delete house 
  - find all rooms in the house
  - find all devices and delete
  -delete all rooms
  - delete all houseUser mappings
  - delete house id from all owner's documents
  -delete the house from house collection
*/
router.delete('/api/houses/:houseId/delete-house', async (req, res) => {
    try {
        const { houseId } = req.params;

        const token = req.headers.authorization?.split(" ")[1];
        if (!token) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const decoded = jwt.verify(token, SECRET_KEY);
        const userId = decoded.userId;

        const hasPermission = await checkPermission(userId, "deleteHouse");
        if (!hasPermission) {
            return res.status(403).json({ success: false, message: "Permission denied to delete house" });
        }

        console.log(`[DEBUG] Deleting house ${houseId} requested by user ${userId}`);

        // Get all devices belonging to this house, and delete the automation mappings
        const devices = await Device.find({ house: houseId });
        const deviceIds = devices.map(device => device._id);
        await DeviceAutomation.deleteMany({ device_id: { $in: deviceIds } });
        console.log(`[DEBUG] Deleted automations from rooms in house ${houseId}`);

        const rooms = await Room.find({ house: houseId });
        const roomIds = rooms.map(room => room._id);

        const deviceDeleteResult = await Device.deleteMany({ room: { $in: roomIds } });
        console.log(`[DEBUG] Deleted ${deviceDeleteResult.deletedCount} devices from rooms in house ${houseId}`);

        const roomDeleteResult = await Room.deleteMany({ house: houseId });
        console.log(`[DEBUG] Deleted ${roomDeleteResult.deletedCount} rooms from house ${houseId}`);

        const houseUserDeleteResult = await HouseUser.deleteMany({ house_id: houseId });
        console.log(`[DEBUG] Deleted ${houseUserDeleteResult.deletedCount} user mappings for house ${houseId}`);

        const ownerUpdateResult = await User.updateMany(
            { houses: houseId },
            { $pull: { houses: houseId } }
        );
        console.log(`[DEBUG] Removed house ${houseId} from ${ownerUpdateResult.modifiedCount} user(s)`);

        const houseDeleteResult = await House.findByIdAndDelete(houseId);
        if (!houseDeleteResult) {
            return res.status(404).json({ success: false, message: "House not found" });
        }

        console.log(`[DEBUG] Successfully deleted house ${houseId}`);
        res.status(200).json({ success: true, message: "House deleted successfully" });

    } catch (error) {
        console.error("[ERROR] Deleting house ->", error);
        res.status(500).json({ success: false, message: "Failed to delete house" });
    }
});

/*
  Add room doc to rooms collection and room id to array of rooms in house doc
*/
router.post('/api/houses/:houseId/rooms/add-room', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) return res.status(401).json({ error: 'Unauthorized' });

        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        const userId = decoded.userId;

        const hasPermission = await checkPermission(userId, "addRoom");
        if (!hasPermission) {
            return res.status(403).json({ error: 'Permission denied to add room' });
        }

        const { houseId } = req.params;
        const { room_name } = req.body;

        if (!room_name) {
            return res.status(400).json({ error: 'Room name is required' });
        }

        const house = await House.findById(houseId);
        if (!house) {
            return res.status(404).json({ error: 'House not found' });
        }

        const newRoom = new Room({ room_name, house: houseId });
        await newRoom.save();

        house.rooms.push(newRoom._id);
        await house.save();

        res.status(201).json({ message: 'Room added successfully', room: newRoom });
    } catch (error) {
        console.error('[ERROR] Adding room:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/api/rooms', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const decoded = jwt.verify(token, SECRET_KEY);
        const userId = decoded.userId;
        const user = await User.findById(userId).populate({
            path: 'houses',
            populate: { path: 'rooms', populate: { path: 'house', select: 'house_name' } }
        });

        if (!user) return res.status(404).json({ message: 'User not found' });

        const rooms = user.houses.flatMap(house => house.rooms || []);
        res.status(200).json({ rooms });
    } catch (err) {
        console.error('[ERROR] GET /api/rooms ->', err);
        res.status(500).json({ error: 'Failed to fetch rooms' });
    }
});


router.put('/api/devices/:id/update-room', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) return res.status(401).json({ error: "Unauthorized" });

        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        const userId = decoded.userId;

        const { id } = req.params;
        const { newRoomId } = req.body;

        if (!newRoomId) return res.status(400).json({ error: "Missing newRoomId" });

        const device = await Device.findById(id);
        if (!device) return res.status(404).json({ error: "Device not found" });

        const oldRoom = await Room.findById(device.room);
        if (oldRoom) {
            oldRoom.devices = oldRoom.devices.filter(d => d.toString() !== id);
            await oldRoom.save();
        }

        const newRoom = await Room.findById(newRoomId);
        if (!newRoom) return res.status(404).json({ error: "Target room not found" });

        device.room = newRoomId;
        await device.save();

        newRoom.devices.push(device._id);
        await newRoom.save();

        res.status(200).json({ success: true, message: "Device room updated", device });
    } catch (error) {
        console.error("[ERROR] PUT /api/devices/:id/update-room", error);
        res.status(500).json({ error: "Server error" });
    }
});

router.put('/api/houses/:houseId/rooms/:roomId/rename', async (req, res) => {
    try {
        const { room_name } = req.body;
        const { roomId } = req.params;
        if (!room_name) return res.status(400).json({ error: "room_name is required" });

        const room = await Room.findByIdAndUpdate(roomId, { room_name }, { new: true });
        if (!room) return res.status(404).json({ error: "Room not found" });

        res.status(200).json({ success: true, room });
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
});

router.get('/api/user/houses', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) return res.status(401).json({ error: 'Unauthorized' });

        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        const userId = decoded.userId;

        const user = await User.findById(userId).populate("houses", "house_name");
        if (!user) return res.status(404).json({ error: "User not found" });

        res.json({ houses: user.houses });
    } catch (error) {
        console.error('[ERROR] GET /api/user/houses ->', error);
        res.status(500).json({ error: 'Server error' });
    }
});
/*
  delete room - deletes the devices in the room first, then deletes the id from the array in house, then deletes the room doc
*/
router.delete("/api/houses/:houseId/rooms/delete-room/:roomId", async (req, res) => {
    console.log("[DEBUG] DELETE /api/houses/:houseId/rooms/delete-room/:roomId ->", req.params);

    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) {
            console.log("[DEBUG] No token provided");
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.SECRET_KEY);
        } catch (err) {
            console.log("[DEBUG] Invalid token");
            return res.status(401).json({ success: false, message: "Invalid token" });
        }

        const userId = decoded.userId;
        const { houseId, roomId } = req.params;

        const hasPermission = await checkPermission(userId, "deleteRoom");
        if (!hasPermission) {
            console.log(`[DEBUG] Permission denied for user ${userId}`);
            return res.status(403).json({ success: false, message: "Permission denied" });
        }

        const room = await Room.findById(roomId);
        if (!room) {
            console.log(`[DEBUG] Room not found with id: ${roomId}`);
            return res.status(404).json({ error: "Room not found" });
        }

        const devicesDeleteResult = await Device.deleteMany({ room: roomId });
        console.log(`[DEBUG] Deleted devices in room ${roomId}:`, devicesDeleteResult.deletedCount);

        const houseUpdateResult = await House.updateOne(
            { _id: houseId },
            { $pull: { rooms: roomId } }
        );
        console.log(`[DEBUG] Removed room ${roomId} from house ${houseId}:`, houseUpdateResult);

        await Room.findByIdAndDelete(roomId);
        console.log(`[DEBUG] Deleted room with id: ${roomId}`);

        res.json({ message: "Room and its devices deleted successfully" });
    } catch (error) {
        console.error("[ERROR] DELETE /api/houses/:houseId/rooms/delete-room/:roomId ->", error);
        res.status(500).json({ error: "Failed to delete room" });
    }
});

/*
  Get all rooms in a house
*/
router.get('/api/houses/:houseId/rooms', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            console.log('[DEBUG] No token provided');
            return res.status(401).json({ error: 'Unauthorized' });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.SECRET_KEY);
        } catch (error) {
            console.log('[DEBUG] Invalid token');
            return res.status(403).json({ error: 'Forbidden' });
        }

        const { houseId } = req.params;
        console.log(`[DEBUG] GET /api/houses/${houseId}/rooms -> Fetching rooms for user ${decoded.userId}`);

        const house = await House.findById(houseId).populate('rooms');
        if (!house) {
            console.error(`[ERROR] House not found with id: ${houseId}`);
            return res.status(404).json({ error: 'House not found' });
        }

        console.log(`[DEBUG] Found house "${house.house_name}" with ${house.rooms.length} rooms`);
        res.status(200).json({ success: true, rooms: house.rooms });

    } catch (error) {
        console.error(`[ERROR] Fetching rooms ->`, error);
        res.status(500).json({ error: 'Server error while fetching rooms for house' });
    }
});

/*
  Get all devices under a room
*/
router.get('/api/houses/:houseId/rooms/:roomId/devices', async (req, res) => {
    try {
        const { houseId, roomId } = req.params;
        console.log(`[DEBUG] GET /api/houses/${houseId}/rooms/${roomId}/devices -> Fetching room with devices`);

        const house = await House.findOne({ _id: houseId, rooms: roomId });
        if (!house) {
            console.error(`[ERROR] House ${houseId} does not contain room ${roomId}`);
            return res.status(404).json({ error: 'Room not found in the specified house' });
        }

        const room = await Room.findById(roomId).populate('devices');
        if (!room) {
            console.error(`[ERROR] Fetching room: ${roomId} -> Room not found`);
            return res.status(404).json({ error: 'Room not found' });
        }

        console.log(`[DEBUG] Found room "${room.room_name}" with ${room.devices.length} devices`);
        res.status(200).json({ success: true, devices: room.devices });
    } catch (error) {
        console.error(`[ERROR] Fetching devices ->`, error);
        res.status(500).json({ error: 'Server error while fetching devices for room' });
    }
});

/*
  Get all houses under a user
*/
router.get('/api/houses/owned', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) return res.status(401).json({ success: false, message: "Unauthorized" });

        const decoded = jwt.verify(token, SECRET_KEY);
        const userId = decoded.userId;

        console.log(`[DEBUG] Fetching houses for owner: ${userId}`);

        const ownedHouseMappings = await HouseUser.find({ user_id: userId, role: 'Home Owner' });

        if (!ownedHouseMappings.length) {
            console.log(`[DEBUG] No houses found for owner: ${userId}`);
            return res.status(404).json({ success: false, message: 'No houses found for this user' });
        }

        const houseIds = ownedHouseMappings.map(mapping => mapping.house_id);
        const houses = await House.find({ _id: { $in: houseIds } });
        console.log(`[DEBUG] Found ${houses.length} houses for owner ${userId}`);
        res.status(200).json({ success: true, houses });

    } catch (error) {
        console.error('[ERROR] Fetching owned houses ->', error);
        res.status(500).json({ success: false, message: 'Failed to fetch houses' });
    }
}); 

/*
  get all users under a house 
*/

router.get('/api/houses/:houseId/users', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) return res.status(401).json({ success: false, message: "Unauthorized" });

        const decoded = jwt.verify(token, SECRET_KEY);
        const userId = decoded.userId;

        console.log(`[DEBUG] Fetching users for house: ${req.params.houseId}`);
        const houseUsers = await HouseUser.find({ house_id: req.params.houseId });

        if (!houseUsers.length) {
            console.log(`[DEBUG] No users found in house: ${req.params.houseId}`);
            return res.status(404).json({ success: false, message: 'No users found in this house' });
        }

        const userIds = houseUsers.map(entry => entry.user_id);
        const userRoles = houseUsers.reduce((acc, entry) => {
            acc[entry.user_id] = entry.role;
            return acc;
        }, {});

        const users = await User.find({ _id: { $in: userIds } }).select('-password');
        const usersWithRoles = users.map(user => ({
            ...user.toObject(),
            role: userRoles[user._id.toString()]
        }));

        console.log(`[DEBUG] Found ${usersWithRoles.length} users in house ${req.params.houseId}`);
        res.status(200).json({ success: true, users: usersWithRoles });

    } catch (error) {
        console.error('[ERROR] Fetching house users ->', error);
        res.status(500).json({ success: false, message: 'Failed to fetch users in house' });
    }
});

/*
Get energy usage data
*/
router.get('/api/energy-usage', async (req, res) => {
    console.log('[DEBUG] GET /api/energy-usage');
    logDbState('/api/energy-usage');

    try {
        if (mongoose.connection.readyState !== 1) {
            console.log('[DEBUG] Mongoose not connected, returning 500');
            return res.status(500).json({ error: 'Database not connected' });
        }

        // Get query parameters
        const range = req.query.range || 'weekly';
        const start = req.query.start;
        const end = req.query.end;

        console.log(`[DEBUG] Request params - range: ${range}, start: ${start}, end: ${end}`);

        // Build the query
        let query = {};

        // If start and end dates are provided, use them for filtering
        if (start && end) {
            query.date = {
                $gte: new Date(start),
                $lte: new Date(end)
            };
            console.log(`[DEBUG] Filtering by date range: ${start} to ${end}`);
        } else {
            // Fallback to default behavior if no date range provided
            let limit = 7;
            if (range === 'monthly') limit = 31;
            else if (range === 'yearly') limit = 365;

            console.log(`[DEBUG] No date range provided, using default limit: ${limit}`);

            // Get the most recent data
            const energyData = await EnergyUsage.find()
                .sort({ date: -1 })
                .limit(limit);

            if (!Array.isArray(energyData) || energyData.length === 0) {
                console.log('[DEBUG] No energy usage data found in the collection');
                return res.status(404).json({ error: 'No energy usage data found' });
            }

            // Return the data in chronological order (oldest first)
            return res.json(energyData.reverse());
        }

        // Execute the query with date filtering
        const energyData = await EnergyUsage.find(query).sort({ date: 1 });

        console.log(`[DEBUG] Fetched ${energyData.length} energy records for date range: ${start} to ${end}`);

        if (!Array.isArray(energyData) || energyData.length === 0) {
            console.log('[DEBUG] No energy usage data found for the specified range');
            return res.status(404).json({ error: 'No energy usage data found for the specified date range' });
        }

        res.json(energyData);
    } catch (error) {
        console.error('[ERROR] GET /api/energy-usage ->', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Add a new endpoint to get all energy usage data
router.get('/api/energy-usage/all', async (req, res) => {
    console.log('[DEBUG] GET /api/energy-usage/all');
    logDbState('/api/energy-usage/all');

    try {
        if (mongoose.connection.readyState !== 1) {
            console.log('[DEBUG] Mongoose not connected, returning 500');
            return res.status(500).json({ error: 'Database not connected' });
        }

        // Optional limit parameter with a reasonable default
        const limit = parseInt(req.query.limit) || 1000;

        const energyData = await EnergyUsage.find()
            .sort({ date: 1 })
            .limit(limit);

        console.log(`[DEBUG] Fetched ${energyData.length} total energy records`);

        if (!Array.isArray(energyData) || energyData.length === 0) {
            console.log('[DEBUG] No energy usage data found in the collection');
            return res.status(404).json({ error: 'No energy usage data found' });
        }

        res.json(energyData);
    } catch (error) {
        console.error('[ERROR] GET /api/energy-usage/all ->', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
router.get('/api/notifications', (req, res) => {
    res.json({ notifications }); // Ensuring it's an object with an array
});

/* ============================================================
   AUTOMATION CONFIG
============================================================ */

/* Get all fixed automation rules with associated devices. */
router.get('/api/automations', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) return res.status(401).json({ success: false, message: "Unauthorized" });
        
        let decoded;
        try {
            decoded = jwt.verify(token, SECRET_KEY);
        } catch (err) {
            return res.status(401).json({ success: false, message: "Invalid token" });
        }
        
        const userId = decoded.userId;
        const { houseId } = req.query;
        if (!houseId) return res.status(400).json({ success: false, message: "houseId is required" });
        
        const houseUser = await HouseUser.findOne({ houseId, user_id: userId });
        if (!houseUser) return res.status(403).json({ success: false, message: "Access denied" });
        
        const automations = await Automation.find({ house: houseId });
        const automationIds = automations.map(a => a._id);
        const deviceAutomations = await DeviceAutomation.find({ automation: { $in: automationIds } }).populate('device');
        
        return res.status(200).json({ success: true, automations, deviceAutomations });
    } catch (error) {
        console.error("[ERROR] GET /api/automations ->", error);
        return res.status(500).json({ success: false, message: "Server error" });
    }
});

/* 
  GET /api/automations/:id/status?houseId=...
  - Get the current status and scheduling info of a specific automation rule.
*/
router.get('/api/automations/:id/status', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token)
            return res.status(401).json({ success: false, message: "Unauthorized" });
        let decoded;
        try {
            decoded = jwt.verify(token, SECRET_KEY);
        } catch (err) {
            return res.status(401).json({ success: false, message: "Invalid token" });
        }
        const userId = decoded.userId;
        const { id } = req.params;
        const { houseId } = req.query;
        if (!houseId)
            return res.status(400).json({ success: false, message: "houseId is required" });
        
        // Use HouseUser mapping to check access
        const houseUser = await HouseUser.findOne({ houseId, user_id: userId });
        if (!houseUser)
            return res.status(403).json({ success: false, message: "Access denied" });

        const automation = await Automation.findById(id);
        if (!automation || automation.house.toString() !== houseId) {
            return res.status(404).json({ success: false, message: "Automation rule not found for this house." });
        }
        return res.status(200).json({
            success: true,
            status: automation.status,
            startTime: automation.startTime,
            endTime: automation.endTime
        });
    } catch (error) {
        console.error("[ERROR] GET /api/automations/:id/status ->", error);
        return res.status(500).json({ success: false, message: "Server error" });
    }
});

/* Toggle an automation rule on or off with associated devices. */
router.put('/api/automations/:id/toggle', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) return res.status(401).json({ success: false, message: "Unauthorized" });
        
        let decoded;
        try {
            decoded = jwt.verify(token, SECRET_KEY);
        } catch (err) {
            return res.status(401).json({ success: false, message: "Invalid token" });
        }
        
        const userId = decoded.userId;
        const { id } = req.params;
        const { status, startTime, endTime, houseId } = req.body;
        if (!houseId) return res.status(400).json({ success: false, message: "houseId is required" });
        
        // Check if user is authorized 
        const houseUser = await HouseUser.findOne({ houseId, user_id: userId });
        if (!houseUser) return res.status(403).json({ success: false, message: "Access denied" });
        
        // Retrieve the automation rule 
        const automation = await Automation.findById(id);
        if (!automation) {
            return res.status(404).json({ success: false, message: "Automation rule not found." });
        }
        
        const updateData = { status };
        if (status === true) {
            if (!startTime) {
                return res.status(400).json({ success: false, message: "Start time is required when enabling automation." });
            }
            let calculatedEndTime;
            if (endTime) {
                // Use provided endTime if given
                calculatedEndTime = new Date(endTime);
            } else {
                // No endTime provided, so check if any associated device is "cleaning" or "kitchen" type
                const deviceAutomations = await DeviceAutomation.find({ automation: id }).populate('device_id');
                const hasCleaningOrKitchen = deviceAutomations.some(mapping => 
                    mapping.device_id && 
                    (mapping.device_id.device_type === 'cleaning' || mapping.device_id.device_type === 'kitchen')
                );
                if (hasCleaningOrKitchen) {
                    calculatedEndTime = new Date(startTime);
                    calculatedEndTime.setHours(calculatedEndTime.getHours() + 1); // Fixed duration: 1 hour
                } else {
                    return res.status(400).json({ 
                        success: false, 
                        message: "End time is required for non-cleaning and non-kitchen automations." 
                    });
                }
            }
            updateData.startTime = new Date(startTime);
            updateData.endTime = calculatedEndTime;
        } else {
            updateData.startTime = null;
            updateData.endTime = null;
        }
        
        const updatedAutomation = await Automation.findByIdAndUpdate(id, updateData, { new: true });
        if (!updatedAutomation) {
            return res.status(404).json({ success: false, message: "Automation rule not found." });
        }
        
        // Update all device automation mappings associated with this automation rule to have the same status
        await DeviceAutomation.updateMany({ automation: id }, { status });
        
        return res.status(200).json({ 
            success: true, 
            message: "Automation rule updated successfully.", 
            automation: updatedAutomation 
        });
    } catch (error) {
        console.error("[ERROR] PUT /api/automations/:id/toggle ->", error);
        return res.status(500).json({ success: false, message: "Server error" });
    }
});

export default router;

