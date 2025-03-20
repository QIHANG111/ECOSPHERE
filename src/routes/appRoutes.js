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

dotenv.config();

// If you're using JWT, make sure to import it:
// import jwt from 'jsonwebtoken';
// And have SECRET_KEY either from env or config

/*notes
-build api for houses - add house at signup, add house at user settings, delete house, get all houses under a user, get list of houses in mongodb
-build api for password recovery(forgot password) 
-edit add room to add the room to associated house id
-build automation APIs
-API for push notifications and email alerts
-api for device energy usage(not overall)
-get list of rooms under a house, list of houses under a user*/

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
  Sign up
*/
router.post('/api/signup', async (req, res) => {
    try {
        let { name, email, phone, password, parentUser, user_avatar } = req.body;
        console.log("[DEBUG] Received signup data:", req.body);

        if (!phone) {
            phone = "1234567890";
        }

        if (typeof user_avatar === "undefined" || user_avatar === null) {
            user_avatar = 1;
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "Email already registered" });
        }

        // Automatically assign the "Home Owner" role
        const role = await Role.findOne({ role_name: "Home Owner" });
        if (!role) {
            console.error("[ERROR] Home Owner role not found in database.");
            return res.status(500).json({ message: "Home Owner role not found" });
        }
        console.log("[DEBUG] Found Home Owner role id:", role._id);

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log("[DEBUG] Hashed password:", hashedPassword);

        // Create new user with the role _id from the "Home Owner" role
        const newUser = new User({
            name,
            email,
            phone,
            hashed_password: hashedPassword,
            role_id: role._id,
            parentUser: parentUser || null,
            user_avatar
        });

        await newUser.save();
        res.status(201).json({ message: "User registered successfully", data: newUser });
    } catch (error) {
        console.error("[ERROR] POST /api/signup ->", error);
        res.status(500).json({ message: "Server error" });
    }
});


router.get('/api/getRoleId/:roleName', async (req, res) => {
    try {
        const roleName = req.params.roleName;
        console.log(`[DEBUG] Fetching role_id for: ${roleName}`); // Debugging log

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


router.get('/api/user', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];

        if (!token) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const decoded = jwt.verify(token, SECRET_KEY);
        const userId = decoded.userId;

        // `role_name`
        const user = await User.findById(userId)
            .select("name email phone role_id user_avatar")
            .populate("role_id", "role_name");

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json(user);
    } catch (error) {
        console.error("[ERROR] GET /api/user ->", error);
        res.status(500).json({ message: "Server error" });
    }
});

/*
  Sign in
  NOTE: requires jwt & SECRET_KEY if you truly use token logic
*/
router.post('/api/signin', async (req, res) => {
    console.log('[DEBUG] POST /api/signin -> req.body:', req.body);
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            console.log(`[DEBUG] Sign in failed - user not found for email: ${email}`);
            return res.status(400).json({ message: 'User not found' });
        }

        const isMatch = await bcrypt.compare(password, user.hashed_password);
        if (!isMatch) {
            console.log('[DEBUG] Sign in failed - incorrect password');
            return res.status(400).json({ message: 'Incorrect password' });
        }

        // ✅ JWT Token
        const token = jwt.sign(
            { userId: user._id, email: user.email, role: user.role_id },
            SECRET_KEY,
            { expiresIn: '2h' } // 2h
        );

        console.log(`[DEBUG] User signed in successfully: ${user.email}`);
        res.status(200).json({ message: 'Sign in successfully', token, user });
    } catch (error) {
        console.error('[ERROR] POST /api/signin ->', error);
        res.status(500).json({ message: 'server error' });
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

        // Construct the reset link. FRONTEND_URL should be set to your application's URL.
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
            html: 
                `<p>You requested a password reset. Click the link below to reset your password:</p>
                <p><a href="${resetLink}">${resetLink}</a></p>
                <p>If you did not request this, please ignore this email.</p>`
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

/* ============================================================
   USER CONFIG
============================================================ */

router.put('/api/update-user', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) {
            return res.status(401).json({ message: "Unauthorized" });
        }

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

        if (!updatedUser) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json({ message: "User updated successfully", user: updatedUser });
    } catch (error) {
        console.error("[ERROR] PUT /api/update-user ->", error);
        res.status(500).json({ message: "Server error" });
    }
});



/*
  Add new sub-user
*/
router.post('/api/subusers', async (req, res) => {
    console.log('[DEBUG] POST /api/subusers -> req.body:', req.body);
    logDbState('/api/subusers');
    try {
        const { name, phone, role_id, mainUserEmail } = req.body;

        if (!name || !phone || !role_id || !mainUserEmail) {
            return res.status(400).json({
                success: false,
                message: 'Please enter all fields: name, phone, roleID, and main user email'
            });
        }

        const mainUser = await User.findOne({ email: mainUserEmail });
        if (!mainUser) {
            console.log(`[DEBUG] Main user not found by email: ${mainUserEmail}`);
            return res.status(400).json({ success: false, message: 'Main user not found' });
        }

        // Potential mismatch between role_id and roleID if your schema differs
        const newSubUser = new User({
            name,
            phone,
            roleID: role_id,
            parentUser: mainUser._id
        });

        await newSubUser.save();
        console.log('[DEBUG] Sub-user created:', newSubUser._id);
        res.status(201).json({ success: true, message: 'Sub-user created successfully', data: newSubUser });
    } catch (error) {
        console.error('[ERROR] POST /api/subusers ->', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

const mainRole = 'Home Owner';
const subRole = 'Home Dweller';


/*
  Delete user by ID
  - If manager, also deletes subusers
  - If dweller, just that user
  - Otherwise, just that user
*/
router.delete('/api/users/:id', async (req, res) => {
    console.log('[DEBUG] DELETE /api/users/:id ->', req.params);
    logDbState('/api/users/:id');
    try {
        const { id } = req.params;
        const requestingUserRole = req.user && req.user.roleID;

        const userToDelete = await User.findById(id);
        if (!userToDelete) {
            console.log(`[DEBUG] No user found with id: ${id}`);
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (userToDelete.roleID === mainRole) {
            if (requestingUserRole !== mainRole) {
                console.log('[DEBUG] Non-manager attempting to delete a manager');
                return res
                    .status(403)
                    .json({ success: false, message: 'Only managers can delete a manager account.' });
            }
            const result = await User.deleteMany({
                $or: [{ _id: id }, { parentUser: id }]
            });
            console.log('[DEBUG] Manager + subusers delete result:', result);
            return res
                .status(200)
                .json({ success: true, message: 'Manager and all associated dwellers have been deleted.' });
        } else if (userToDelete.roleID === subRole) {
            await User.findByIdAndDelete(id);
            console.log(`[DEBUG] Deleted dweller with id: ${id}`);
            return res.status(200).json({ success: true, message: 'Dweller has been deleted.' });
        } else {
            await User.findByIdAndDelete(id);
            console.log(`[DEBUG] Deleted user with id: ${id} (unrecognized role)`);
            return res.status(200).json({ success: true, message: 'User has been deleted.' });
        }
    } catch (error) {
        console.error('[ERROR] DELETE /api/users/:id ->', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

/*
  Get all users under a certain manager
*/
router.get('/api/users/parent/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const parentUser = await User.findById(id);
        if (!parentUser) {
            return res.status(404).json({ success: false, message: "Parent user not found" });
        }


        const subUsers = await User.find({ parentUser: id }).populate("role_id", "role_name");

        res.status(200).json({
            success: true,
            parent: parentUser,
            subUsers
        });
    } catch (error) {
        console.error("[ERROR] GET /api/users/parent/:id ->", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

/*
  Get all users
*/
router.get('/api/allusers', async (req, res) => {
    console.log('[DEBUG] GET /api/allusers');
    logDbState('/api/allusers');
    try {
        const users = await User.find();
        console.log(`[DEBUG] Found ${users.length} total users`);
        res.status(200).json({ success: true, users });
    } catch (error) {
        console.error('[ERROR] GET /api/allusers ->', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});


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

const checkPermission = async (userId, permissionName) => {
    try {
        const user = await User.findById(userId).populate('role_id');
        if (!user || !user.role_id) return false;

        const rolePermissions = await RolePermission.find({ role_id: user.role_id._id }).populate('permission_id');
        if (!rolePermissions || rolePermissions.length === 0) return false;

        return rolePermissions.some(rp => rp.permission_id.name === permissionName);
    } catch (error) {
        console.error('[ERROR] checkPermission ->', error);
        return false;
    }
};

/*
  Add device
*/
/*
  Add device and update the room's devices list if a roomName is provided.
  Expected request body should include:
    - device_name
    - device_type
    - roomName: the name of the room where this device belongs. if not specified, doesnt add it to rooms
*/
router.post('/api/device', async (req, res) => {
    console.log('[DEBUG] POST /api/device -> req.body:', req.body);

    // Destructure roomName from the request body; the rest is deviceData.
    const { roomName, ...deviceData } = req.body;

    // Validate required fields for the device (do not require status as default is "off")
    if (!deviceData.device_name || !deviceData.device_type) {
        console.error('[ERROR] Missing required device fields (device_name or device_type)', error);
        res.status(400).json({ error: 'Please enter all required fields (device_name and device_type)' });
    }

    const newDevice = new Device(deviceData);

    try {
        // Save the device first; status will be set to default ("off")
        await newDevice.save();
        console.log('[DEBUG] Created new device:', newDevice._id);

        // If a roomName is provided, update the room document accordingly
        if (roomName) {
            const room = await Room.findOne({ room_name: roomName });
            if (room) {
                // Add the device id to the room's devices array
                room.devices.push(newDevice._id);
                await room.save();

                // Also update the new device's room field to reference this room
                newDevice.room = room._id;
                await newDevice.save();
                console.log(`[DEBUG] Added device ${newDevice._id} to room "${room.room_name}"`);
            } else {
                console.warn(`[WARNING] Room with name "${roomName}" not found.`);
            }
        }

        res.status(201).json({ success: true, data: newDevice });
    } catch (error) {
        console.error('[ERROR] POST /api/device ->', error);
        res.status(500).json({ error: 'Server Error' });
    }
});

/*
  Delete device by id and remove its reference from the room's devices array (if room specified)
*/
router.delete('/api/device/:id', async (req, res) => {
    console.log('[DEBUG] DELETE /api/device/:id ->', req.params);
    logDbState('/api/device/:id');
    const { id } = req.params;
    const userId = req.user && req.user._id;

    try {
        const hasPermission = await checkPermission(userId, "deleteDevice");
        if (!hasPermission) {
            console.log(`[DEBUG] Permission denied for user ${userId}`);
            return res.status(403).json({ success: false, message: 'Permission denied' });
        }

        const device = await Device.findById(id);
        if (!device) {
            console.error(`[ERROR] Fetching device by id: ${id}`, error);
            res.status(404).json({ error: 'Device not found' });
        }

        // If the device is associated with a room, remove its id from the room's devices array
        if (device.room) {
            const room = await Room.findById(device.room);
            if (room) {
                room.devices = room.devices.filter(devId => devId.toString() !== id);
                await room.save();
                console.log(`[DEBUG] Removed device ${id} from room "${room.room_name}" (${room._id})`);
            }
        }

        // Delete the device from the devices collection
        await Device.findByIdAndDelete(id);
        console.log(`[DEBUG] Deleted device with id: ${id}`);
        res.status(200).json({ success: true, message: 'Device deleted successfully' });
    } catch (error) {
        console.error('[ERROR] DELETE /api/device/:id ->', error);
        res.status(500).json({ error: 'Server Error' });
    }
});

/*
  Get the list of devices in mongodb
*/
router.get('/api/devices', async (req, res) => {
    console.log('[DEBUG] GET /api/devices -> Fetching devices from MongoDB');
    try {
        const devices = await Device.find();
        if (!devices || devices.length === 0) {
            console.error('[ERROR] Finding devices in the database ->', error);
            return res.status(404).json({ error: 'No devices found' });
        }
        console.log(`[DEBUG] /api/devices -> found ${devices.length} devices in MongoDB`);
        res.json(devices);
    } catch (error) {
        console.error('[ERROR] Fetching devices from MongoDB ->', error);
        res.status(500).json({ error: 'Server error while fetching devices' });
    }
});

/* 
  GET all devices under a room by room id using population 
*/
router.get('/api/rooms/:roomId/devices', async (req, res) => {
    try {
        const { roomId } = req.params;
        console.log(`[DEBUG] GET /api/rooms/${roomId}/devices -> Fetching room with devices`);

        // Find the room by its ID and populate the devices array
        const room = await Room.findById(roomId).populate('devices');
        if (!room) {
            console.error(`[ERROR] Fetching room: ${roomId}`, error);
            res.status(404).json({ error: 'Room not found' });
        }

        console.log(`[DEBUG] Found room "${room.room_name}" with ${room.devices.length} devices`);
        res.status(200).json({ success: true, devices: room.devices });
    } catch (error) {
        console.error(`[ERROR] Fetching devices ->`, error);
        res.status(500).json({ error: 'Server error while fetching devices for room' });
    }
});

/*
  Update the status of a specific device
*/
router.post('/api/update-device', async (req, res) => {
    console.log('[DEBUG] POST /api/update-device -> req.body:', req.body);


    if (!req.body || typeof req.body.name !== 'string' || (typeof req.body.status !== 'boolean' && req.body.status !== "true" && req.body.status !== "false")) {
        console.error('[ERROR] Parsing body:', req.body);
        return res.status(400).json({ error: "Invalid request format. 'name' must be a string and 'status' must be a boolean or a valid string ('true'/'false')." });
    }

    const name = req.body.name;
    const status = req.body.status === "true" || req.body.status === true;

    try {
        const updatedDevice = await Device.findOneAndUpdate(
            { device_name: name },
            { status: status },
            { new: true }
        );

        if (!updatedDevice) {
            console.log(`[DEBUG] Device not found with name: ${name}`);
            return res.status(404).json({ error: 'Device not found' });
        }

        console.log(`[DEBUG] Updated device '${name}' status to: ${status}`);
        return res.json({ success: true, updatedDevice });

    } catch (error) {
        console.error('[ERROR] Updating device status in MongoDB ->', error);
        return res.status(500).json({ error: 'Server error while updating device status' });
    }
});

/*
    Update the temperature of a specific AC device
*/
router.post('/api/update-temperature', async (req, res) => {
    console.log('[DEBUG] POST /api/update-temperature -> req.body:', req.body);

    if (!req.body || typeof req.body.name !== 'string' || typeof req.body.temperature !== 'number') {
        console.log('[DEBUG] Invalid update-temperature body');
        return res.status(400).json({
            error: "Invalid request format. 'name' must be a string and 'temperature' must be a number."
        });
    }

    const { name, temperature } = req.body;

    try {
        // Find and update the AC device in MongoDB
        console.log(`[DEBUG] Finding AC device of name: ${name}`);
        const updatedDevice = await Device.findOneAndUpdate(
            { device_name: name, device_type: 'AC' },
            { temperature: temperature },             // Update temperature field
            { new: true }
        );

        if (!updatedDevice) {
            console.error(`[ERROR] Finding AC device ${name} ->`, error);
            res.status(404).json({ error: 'AC device not found' });
        }

        console.log(`[DEBUG] Updated AC device '${name}' temperature to: ${temperature}`);
        res.json({ success: true, updatedDevice });

    } catch (error) {
        console.error('[ERROR] Updating AC temperature ->', error);
        res.status(500).json({ error: 'Server error while updating temperature' });
    }
});

/*
    Adjust light brightness
*/
router.put("/api/devices/:id/adjust-brightness", async (req, res) => {
    try {
        const { brightness } = req.body;
        const deviceId = req.params.id;
        console.log(`[DEBUG] Received request to update brightness for device ID: ${deviceId}`);
        console.log(`[DEBUG] Requested brightness level: ${brightness}`);

        if (brightness < 1 || brightness > 5) {
            console.error('[ERROR] Adjusting brightness ->', error);
            res.status(400).json({ error: "Brightness level must be between 1 and 5" });
        }

        const device = await Device.findById(deviceId);

        if (!device) {
            console.error('[ERROR] Finding device. ->', error);
            res.status(404).json({ error: "Device not found" });
        }

        console.log(`[DEBUG] Device found: ${device.device_name}, (Type: ${device.device_type})`);

        if (device.device_type !== "light") {
            console.error("[ERROR] Getting device type. ->");
            res.status(400).json({ error: "This device is not a light" });
        }

        console.log(`[DEBUG] Updating brightness from ${device.brightness} to ${brightness}`);
        device.brightness = brightness;

        console.log(`[DEBUG] Saving brightness changes to ${device.brightness}`);
        await device.save();
        res.status(200).json({ success: true, message: "Brightness adjusted successfully", data: device });

    } catch (error) {
        console.error("[ERROR] Adjusting brightness ->", error);
        res.status(500).json({ error: "Server error" });
    }
});

/*
  get all devices under a room
*/
router.get('/api/rooms/:roomId/devices', async (req, res) => {
    try {
        const { roomId } = req.params;
        console.log(`[DEBUG] GET /api/rooms/${roomId}/devices -> Fetching devices for room: ${roomId}`);

        const devices = await Device.find({ room: roomId });
        console.log(`[DEBUG] Found ${devices.length} devices for room ${roomId}`);

        res.status(200).json({ success: true, devices });
    } catch (error) {
        console.error('[ERROR] GET /api/rooms/:roomId/devices ->', error);
        res.status(500).json({ success: false, message: "Server error while fetching devices" });
    }
});

/*
  get all devices under a house
*/
router.get('/api/houses/:houseId/devices', async (req, res) => {
    try {
        const { houseId } = req.params;
        console.log(`[DEBUG] GET /api/houses/${houseId}/devices -> Fetching devices for house: ${houseId}`);

        const house = await House.findById(houseId);
        if (!house) {
            console.log(`[DEBUG] House not found: ${houseId}`);
            return res.status(404).json({ success: false, message: "House not found" });
        }

        if (!house.rooms || house.rooms.length === 0) {
            console.log(`[DEBUG] No rooms found in house: ${houseId}`);
            return res.status(200).json({ success: true, devices: [] });
        }

        const devices = await Device.find({ room: { $in: house.rooms } });
        console.log(`[DEBUG] Found ${devices.length} devices for house ${houseId}`);

        res.status(200).json({ success: true, devices });
    } catch (error) {
        console.error(`[ERROR] GET /api/houses/:houseId/devices ->`, error);
        res.status(500).json({ success: false, message: "Server error while fetching house devices" });
    }
});

/*
  Get status of a device
*/
router.get("/api/device/status/:id", async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`[DEBUG] GET /api/device/status/${id} -> Fetching device status`);

        const device = await Device.findById(id).select("status");
        if (!device) {
            console.error(`[ERROR] Device not found: ${id}`, error);
            res.status(404).json({ error: "Device not found" });
        }

        console.log(`[DEBUG] Device status for ${id}: ${device.status}`);
        res.status(200).json({ success: true, status: device.status });
    } catch (error) {
        console.error(`[ERROR] Fetching device status ->`, error);
        res.status(500).json({error: "Server error" });
    }
});

/*
  adjust fan speed
*/
router.put("/api/devices/:id/fan-speed", async (req, res) => {
    try {
        const { fanSpeed } = req.body;
        const deviceId = req.params.id;

        console.log(`[DEBUG] PUT /api/devices/${deviceId}/fan-speed -> Received fanSpeed: ${fanSpeed}`);

        // Validate fanSpeed value: must be a number between 1 and 8
        if (typeof fanSpeed !== "number" || fanSpeed < 1 || fanSpeed > 8) {
            console.error("[ERROR] Invalid fan speed value. Must be between 1 and 8.", error);
            res.status(400).json({ error: "Fan speed must be between 1 and 8" });
        }

        // Find the device by ID
        const device = await Device.findById(deviceId);
        if (!device) {
            console.log(`[ERROR] Device not found: ${deviceId}`, error);
            res.status(404).json({ error: "Device not found" });
        }

        // Check if the device is of type "fan"
        if (device.device_type !== "fan") {
            console.error(`[ERROR] Device type mismatch. Expected "fan", but found "${device.device_type}"`, error);
            res.status(400).json({ error: "This device is not a fan" });
        }

        // Update the fan speed
        console.log(`[DEBUG] Updating fan speed from ${device.fan_speed} to ${fanSpeed}`);
        device.fan_speed = fanSpeed;
        await device.save();

        console.log(`[DEBUG] Device ${deviceId} fan speed updated successfully to ${device.fan_speed}`);
        res.status(200).json({ success: true, message: "Fan speed updated successfully", data: device });
    } catch (error) {
        console.error(`[ERROR] PUT /api/devices/:id/fan-speed ->`, error);
        res.status(500).json({ success: false, message: "Server error while updating fan speed" });
    }
});

router.post("/api/device/mode", (req, res) => {
    res.json(deviceController.setMode(req.body.id, req.body.mode));
});

/* ============================================================
   ROOMS CONFIG
============================================================ */

/*
  Add room
*/
router.post('/api/rooms', async (req, res) => {
    console.log('[DEBUG] POST /api/rooms -> req.body:', req.body);
    logDbState('/api/rooms');
    try {
        const { room_name, room_type } = req.body;
        if (!room_name || !room_type) {
            console.log('[DEBUG] Missing room_name or room_type');
            return res.status(400).json({ error: 'All fields are required' });
        }

        const newRoom = new Room({ room_name, room_type });
        await newRoom.save();
        console.log('[DEBUG] New room created:', newRoom._id);

        res.status(201).json({ message: 'Room added successfully', room: newRoom });
    } catch (error) {
        console.error('[ERROR] POST /api/rooms ->', error);
        res.status(500).json({ error: 'Failed to add room' });
    }
});

/*
  Delete room
*/
router.delete('/api/rooms/:id', async (req, res) => {
    console.log('[DEBUG] DELETE /api/rooms/:id ->', req.params);
    logDbState('/api/rooms/:id');
    try {
        const hasPermission = await checkPermission(userId, "deleteDevice");
        if (!hasPermission) {
            console.log(`[DEBUG] Permission denied for user ${userId}`);
            return res.status(403).json({ success: false, message: 'Permission denied' });
        }

        const { id } = req.params;

        const room = await Room.findById(id);
        if (!room) {
            console.log(`[DEBUG] Room not found with id: ${id}`);
            return res.status(404).json({ error: 'Room not found' });
        }

        await Room.findByIdAndDelete(id);
        console.log(`[DEBUG] Deleted room with id: ${id}`);
        res.json({ message: 'Room deleted successfully' });
    } catch (error) {
        console.error('[ERROR] DELETE /api/rooms/:id ->', error);
        res.status(500).json({ error: 'Failed to delete room' });
    }
});

/* ============================================================
   HOUSE CONFIG
============================================================ */



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


        const range = req.query.range || 'weekly';
        let limit = 7;

        if (range === 'monthly') limit = 30;
        else if (range === 'yearly') limit = 365;


        const energyData = await EnergyUsage.find().sort({ date: -1 }).limit(limit);

        console.log(`[DEBUG] Fetched ${energyData.length} energy records for range: ${range}`);

        if (!Array.isArray(energyData) || energyData.length === 0) {
            console.log('[DEBUG] No energy usage data found in the collection');
            return res.status(404).json({ error: 'No energy usage data found' });
        }

        res.json(energyData.reverse());
    } catch (error) {
        console.error('[ERROR] GET /api/energy-usage ->', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get('/api/notifications', (req, res) => {
    res.json({ notifications }); // Ensuring it's an object with an array
});



export default router;

