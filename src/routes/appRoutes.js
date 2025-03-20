import express from 'express';
import bcrypt from 'bcryptjs';
import {EnergyUsage, User, Device, House, Room, Device, HouseUser, Role, RolePermission } from '../models';
import mongoose from 'mongoose';
import authMiddleware from '../middleware/authMiddleware.js';
import jwt from 'jsonwebtoken';
import { error } from 'node:console';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import path from 'node:path';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();
const SECRET_KEY = process.env.SECRET_KEY;

// If you're using JWT, make sure to import it:
// import jwt from 'jsonwebtoken';
// And have SECRET_KEY either from env or config

/*
notes
-factory reset
-build automation APIs
-api for device energy usage(not overall)
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
  Sign up
  - Automatically assigns the "Home Owner" role.
  - Automatically creates a house for the new user.
  - Inserts a mapping in the HouseUser collection.
  - Updates the user's houses array with the newly created house ID.
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

        // Create new user with the "Home Owner" role
        const newUser = new User({
            name,
            email,
            phone,
            hashed_password: hashedPassword,
            role_id: role._id,
            parentUser: parentUser || null,
            user_avatar,
            houses: [] // Initialize houses array
        });
        await newUser.save();
        console.log("[DEBUG] New user created:", newUser._id);

        // Automatically create a house for the new Home Owner.
        const houseName = `${newUser.name}'s House`;
        const newHouse = new House({
            house_name: houseName,
            rooms: [],
            owner_id: newUser._id
        });
        await newHouse.save();
        console.log("[DEBUG] New house created:", newHouse._id);

        // Insert mapping into the HouseUser collection: the user is mapped to the house as Home Owner
        const houseUserMapping = new HouseUser({
            house_id: newHouse._id,
            user_id: newUser._id,
            role: "Home Owner"
        });
        await houseUserMapping.save();
        console.log("[DEBUG] Created HouseUser mapping:", houseUserMapping._id);

        // Update the user's houses array with the new house ID
        newUser.houses.push(newHouse._id);
        await newUser.save();
        console.log("[DEBUG] Updated user's houses array:", newUser.houses);

        // Optionally, generate a JWT token for the new user (to sign them in immediately)
        const token = jwt.sign(
            { userId: newUser._id, email: newUser.email, role: newUser.role_id },
            SECRET_KEY,
            { expiresIn: '2h' }
        );

        res.status(201).json({ message: "User registered successfully", token, data: newUser });
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
  Add new sub-user (e.g., Home Dweller) without separate credentials.
  Expected request body:
  {
    "name": "Sub User Name",
    "phone": "1234567890",
    "parentEmail": "parent@example.com",  // Parent user's email
    "role": "Home Dweller",               // Role for the sub-user (must exist in Role collection)
    "user_avatar": 2                      // Sub-user's avatar provided explicitly
  }
*/
router.post('/api/subusers', async (req, res) => {
    console.log('[DEBUG] POST /api/subusers -> req.body:', req.body);

    try {
        const { name, phone, parentEmail, role: roleName, user_avatar } = req.body;

        if (!name || !phone || !parentEmail || !roleName) {
            return res.status(400).json({
                success: false,
                message: 'Please provide name, phone, parentEmail, and role'
            });
        }

        // Look up the parent user by email
        const mainUser = await User.findOne({ email: parentEmail });
        if (!mainUser) {
            console.log(`[DEBUG] Parent user not found with email: ${parentEmail}`);
            return res.status(400).json({ success: false, message: 'Parent user not found' });
        }

        // Look up the role provided in the request body
        const roleDoc = await Role.findOne({ role_name: roleName });
        if (!roleDoc) {
            console.error(`[ERROR] Role "${roleName}" not found in database.`);
            return res.status(500).json({ success: false, message: `Role "${roleName}" not found` });
        }
        console.log(`[DEBUG] Found role "${roleName}" with id: ${roleDoc._id}`);

        // Create the sub-user by inheriting parent's email and hashed password,
        // but using the role provided and user_avatar from req.body.
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
        console.log('[DEBUG] Sub-user created:', newSubUser._id);

        // Retrieve the parent's house mapping (assuming the parent is a Home Owner)
        const mainHouseMapping = await HouseUser.findOne({ user_id: mainUser._id, role: "Home Owner" });
        if (mainHouseMapping) {
            // Create a mapping for the sub-user with the provided role in the same house
            const subUserMapping = new HouseUser({
                house_id: mainHouseMapping.house_id,
                user_id: newSubUser._id,
                role: roleName
            });
            await subUserMapping.save();
            console.log("[DEBUG] Created HouseUser mapping for sub-user:", subUserMapping._id);
        } else {
            console.warn("[WARNING] Parent user's house mapping not found; sub-user will not be linked to a house.");
        }

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
  - If manager, also deletes subusers and all House documents registered under that manager.
  - If dweller, just that user.
  - Otherwise, just that user.
  Additionally, deletes the mapping(s) for the deleted user(s) from the HouseUser collection.
*/
router.delete('/api/users/:id', async (req, res) => {
    console.log('[DEBUG] DELETE /api/users/:id ->', req.params);
    logDbState('/api/users/:id');
    try {
        const { id } = req.params;
        const requestingUserRole = req.user && req.user.role_id;

        const userToDelete = await User.findById(id);
        if (!userToDelete) {
            console.log(`[DEBUG] No user found with id: ${id}`);
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (userToDelete.role_id === mainRole) {
            if (requestingUserRole !== mainRole) {
                console.log('[DEBUG] Non-manager attempting to delete a manager');
                return res
                    .status(403)
                    .json({ success: false, message: 'Only managers can delete a manager account.' });
            }
            // Find all users to delete (manager + subusers)
            const usersToDelete = await User.find({
                $or: [{ _id: id }, { parentUser: id }]
            }).select('_id');
            const idsToDelete = usersToDelete.map(u => u._id);

            // Delete users from the User collection
            const result = await User.deleteMany({ _id: { $in: idsToDelete } });
            console.log('[DEBUG] Manager + subusers delete result:', result);

            // Delete corresponding HouseUser mappings for these user ids
            const mappingResult = await HouseUser.deleteMany({ user_id: { $in: idsToDelete } });
            console.log('[DEBUG] Deleted HouseUser mappings for ids:', idsToDelete, mappingResult);

            // Delete all House documents where the owner_id matches the manager's id
            const housesResult = await House.deleteMany({ owner_id: id });
            console.log('[DEBUG] Deleted houses result:', housesResult);

            return res.status(200).json({ success: true, message: 'Manager, all associated dwellers, and all registered houses have been deleted.' });
        } else if (userToDelete.role_id === subRole) {
            await User.findByIdAndDelete(id);
            console.log(`[DEBUG] Deleted dweller with id: ${id}`);

            // Delete the HouseUser mapping for this dweller
            const mappingResult = await HouseUser.deleteMany({ user_id: id });
            console.log(`[DEBUG] Deleted HouseUser mapping for dweller id: ${id}`, mappingResult);

            return res.status(200).json({ success: true, message: 'Dweller has been deleted.' });
        } else {
            await User.findByIdAndDelete(id);
            console.log(`[DEBUG] Deleted user with id: ${id} (unrecognized role)`);

            // Delete the HouseUser mapping for this user
            const mappingResult = await HouseUser.deleteMany({ user_id: id });
            console.log(`[DEBUG] Deleted HouseUser mapping for user id: ${id}`, mappingResult);

            return res.status(200).json({ success: true, message: 'User has been deleted.' });
        }
    } catch (error) {
        console.error('[ERROR] DELETE /api/users/:id ->', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

/*
  Get all users under a certain owner
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

/*
  Get all users under a house
*/
router.get('/api/house-users/:houseId', async (req, res) => {
    try {
        const { houseId } = req.params;
        console.log(`[DEBUG] GET /api/house-users/${houseId} -> Fetching house details`);

        // Find the house by ID and populate the owners and dwellers arrays.
        const house = await House.findById(houseId)
            .populate('owners', 'name email phone') // Adjust fields as necessary
            .populate('dwellers', 'name email phone'); // Adjust fields as necessary

        if (!house) {
            console.log(`[DEBUG] House not found with id: ${houseId}`);
            return res.status(404).json({ success: false, message: 'House not found' });
        }

        console.log(`[DEBUG] Found house: ${house.house_name} with ${house.owners.length} owner(s) and ${house.dwellers.length} dweller(s)`);
        res.status(200).json({ success: true, owners: house.owners, dwellers: house.dwellers });
    } catch (error) {
        console.error('[ERROR] GET /api/house-users/:houseId ->', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

/*
  assign role to user
*/
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
        res.status(500).json({ error: "Server error" });
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

/* ============================================================
   HOUSE CONFIG
============================================================ */

/* 
  Add a house (only homeowners)
*/
router.post('/api/houses/:currentHouseId/add-house', authMiddleware, async (req, res) => {
    try {
        const { newHouseName } = req.body;
        const { currentHouseId } = req.params;
        const userId = req.user._id; 

        if (!newHouseName) {
            return res.status(400).json({ success: false, message: 'House name is required' });
        }

        const houseUserEntry = await HouseUser.findOne({ houseId: currentHouseId, userId, role: 'Home Owner' });
        if (!houseUserEntry) {
            return res.status(403).json({ success: false, message: 'Only home owners can add houses' });
        }

        const newHouse = new House({ 
            house_name: newHouseName,
            owners: [], 
            rooms: [],   
            dwellers: [] 
        });
        await newHouse.save();
        console.log(`[DEBUG] New house created: ${newHouse._id} (${newHouseName})`);

        const currentOwners = await HouseUser.find({ houseId: currentHouseId, role: 'Home Owner' });

        const newHouseUserMappings = currentOwners.map(owner => ({
            houseId: newHouse._id,
            userId: owner.user_id,
            role: 'Home Owner'
        }));

        await HouseUser.insertMany(newHouseUserMappings);
        console.log(`[DEBUG] Assigned ${newHouseUserMappings.length} owners to new house: ${newHouse._id}`);

        res.status(201).json({ 
            success: true, 
            message: 'House added successfully', 
            house: newHouse.toObject()
        });

    } catch (error) {
        console.error('[ERROR] Adding house ->', error);
        res.status(500).json({ success: false, message: 'Failed to add house' });
    }
});

/* 
  Delete a house (only homeowners)
*/
router.delete('/api/houses/:houseId/delete-house', authMiddleware, async (req, res) => {
    try {
        const { houseId } = req.params;
        const userId = req.user._id; 

        const houseUserEntry = await HouseUser.findOne({ houseId, userId, role: 'Home Owner' });
        if (!houseUserEntry) {
            return res.status(403).json({ success: false, message: 'Only home owners can delete houses' });
        }

        console.log(`[DEBUG] Deleting house ${houseId} requested by user ${userId}`);

        // Find all rooms associated with this house
        const rooms = await Room.find({ houseId });
        const roomIds = rooms.map(room => room._id);

        // Find and delete all devices in those rooms
        const deviceDeleteResult = await Device.deleteMany({ roomId: { $in: roomIds } });
        console.log(`[DEBUG] Deleted ${deviceDeleteResult.deletedCount} devices from rooms in house ${houseId}`);

        // Delete all rooms associated with the house
        const roomDeleteResult = await Room.deleteMany({ houseId });
        console.log(`[DEBUG] Deleted ${roomDeleteResult.deletedCount} rooms from house ${houseId}`);

        // Delete all house-user mappings for this house
        const houseUserDeleteResult = await HouseUser.deleteMany({ houseId });
        console.log(`[DEBUG] Deleted ${houseUserDeleteResult.deletedCount} user mappings for house ${houseId}`);

        // Delete the house itself
        const houseDeleteResult = await House.findByIdAndDelete(houseId);
        if (!houseDeleteResult) {
            return res.status(404).json({ success: false, message: 'House not found' });
        }

        console.log(`[DEBUG] Successfully deleted house ${houseId}`);
        res.status(200).json({ success: true, message: 'House deleted successfully' });

    } catch (error) {
        console.error('[ERROR] Deleting house ->', error);
        res.status(500).json({ success: false, message: 'Failed to delete house' });
    }
});

/*
  Get all houses where the current user is owner
*/
router.get('/api/houses/owned', authMiddleware, async (req, res) => {
    try {
        const userId = req.user._id; 
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
  Add room doc in rooms collection, add the room id to the house doc rooms list  
*/
router.post('/api/houses/:houseId/rooms/add-room', authMiddleware, async (req, res) => {
    console.log('[DEBUG] POST /api/houses/:houseId/rooms/add-room -> req.params:', req.params);
    console.log('[DEBUG] POST /api/houses/:houseId/rooms/add-room -> req.body:', req.body);

    try {
        const { houseId } = req.params;
        const { room_name } = req.body;

        if (!room_name) {
            console.log('[DEBUG] Missing room_name');
            return res.status(400).json({ error: 'Room name is required' });
        }

        const house = await House.findById(houseId);
        if (!house) {
            console.warn(`[WARNING] House not found for id: ${houseId}`);
            return res.status(404).json({ error: 'House not found. Cannot add room.' });
        }

        const newRoom = new Room({ room_name, houseId });
        await newRoom.save();
        console.log('[DEBUG] New room created:', newRoom._id);

        house.rooms.push(newRoom._id);
        await house.save();
        console.log(`[DEBUG] Added room ${newRoom._id} to house ${houseId}`);

        res.status(201).json({ message: 'Room added successfully', room: newRoom });
    } catch (error) {
        console.error('[ERROR] POST /api/houses/:houseId/rooms/add-room ->', error);
        res.status(500).json({ error: 'Failed to add room' });
    }
});

/*
  Delete room- delete all devices in the room, delete it from the house, finally delete from rooms collections
*/
router.delete('/api/houses/:houseId/rooms/delete-room/:roomId', authMiddleware, async (req, res) => {
    console.log('[DEBUG] DELETE /api/houses/:houseId/rooms/delete-room/:roomId ->', req.params);
    logDbState('/api/houses/:houseId/rooms/delete-room/:roomId');

    try {
        const { houseId, roomId } = req.params;
        const userId = req.user._id; 

        const hasPermission = await checkPermission(userId, "deleteRoom");
        if (!hasPermission) {
            console.log(`[DEBUG] Permission denied for user ${userId}`);
            return res.status(403).json({ success: false, message: 'Permission denied' });
        }

        const room = await Room.findById(roomId);
        if (!room) {
            console.log(`[DEBUG] Room not found with id: ${roomId}`);
            return res.status(404).json({ error: 'Room not found' });
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

        res.json({ message: 'Room and its devices deleted successfully' });
    } catch (error) {
        console.error('[ERROR] DELETE /api/houses/:houseId/rooms/delete-room/:roomId ->', error);
        res.status(500).json({ error: 'Failed to delete room' });
    }
});

/* 
  GET all devices under a room 
*/
router.get('/api/houses/:houseId/rooms/:roomId/devices', authMiddleware, async (req, res) => {
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
  Get all rooms under a specific house
*/
router.get('/api/houses/:houseId/rooms', authMiddleware, async (req, res) => {
    try {
        const { houseId } = req.params;
        console.log(`[DEBUG] GET /api/houses/${houseId}/rooms -> Fetching rooms`);

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

