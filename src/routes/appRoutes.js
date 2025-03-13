import express from 'express';
import path from 'node:path';
import * as fs from 'node:fs';
import EnergyUsage from '../models/energy.model.js';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import User from '../models/user.model.js';
import Device from '../models/device.model.js';
import bcrypt from 'bcryptjs';
import Room from '../models/room.model.js';
import mongoose from 'mongoose';
// If you're using JWT, make sure to import it:
// import jwt from 'jsonwebtoken';
// And have SECRET_KEY either from env or config

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const devicesFile = path.join(__dirname, '../public/exampleData/device.json');

const router = express.Router();

// Enable JSON body parsing
router.use(express.json());

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
    res.sendFile(path.join(__dirname, '../public/pages/homePage.html'));
});

/*
  Example endpoint: fetch all users
*/
router.get('/api/users', async (req, res) => {
    console.log('[DEBUG] GET /api/users triggered');
    logDbState('/api/users');
    try {
        const users = await User.find();
        console.log(`[DEBUG] Found ${users.length} users`);
        res.json(users);
    } catch (error) {
        console.error('[ERROR] Failed to fetch user data:', error);
        res.status(500).json({ error: 'Failed to fetch user data from database' });
    }
});

/*
  Sign up
*/
router.post('/api/signup', async (req, res) => {
    console.log('[DEBUG] POST /api/signup -> req.body:', req.body);
    logDbState('/api/signup');
    try {
        const { name, email, phone, password, role_id } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            console.log('[DEBUG] Email already registered:', email);
            return res.status(400).json({ message: 'This email is already registered' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user
        const newUser = new User({
            name,
            email,
            phone,
            hashed_password: hashedPassword,
            role_id
        });

        await newUser.save();
        console.log('[DEBUG] New user created:', newUser._id);
        res.status(201).json({ message: 'Sign up successful!' });
    } catch (error) {
        console.error('[ERROR] POST /api/signup ->', error);
        res.status(500).json({ message: 'server error' });
    }
});

/*
  Sign in
  NOTE: requires jwt & SECRET_KEY if you truly use token logic
*/
router.post('/api/signin', async (req, res) => {
    console.log('[DEBUG] POST /api/signin -> req.body:', req.body);
    logDbState('/api/signin');
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

        // If using JWT, ensure these are defined:
        // const token = jwt.sign({ userId: user._id, email: user.email }, SECRET_KEY, {
        //   expiresIn: '1h'
        // });
        // For now, just pretend we have a token:
        const token = 'FAKE_TOKEN';

        console.log(`[DEBUG] User signed in successfully: ${user.email}`);
        res.status(200).json({ message: 'Sign in successfully', token, user });
    } catch (error) {
        console.error('[ERROR] POST /api/signin ->', error);
        res.status(500).json({ message: 'server error' });
    }
});

/* ============================================================
   USER CONFIG
============================================================ */

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

const mainRole = 'manager';
const subRole = 'dweller';

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
    console.log('[DEBUG] GET /api/users/parent/:id ->', req.params);
    logDbState('/api/users/parent/:id');
    try {
        const { id } = req.params;
        const parentUser = await User.findById(id);
        if (!parentUser) {
            console.log(`[DEBUG] Parent user not found with id: ${id}`);
            return res.status(404).json({ success: false, message: 'Parent user not found' });
        }

        const subUsers = await User.find({ parentUser: id });
        console.log(`[DEBUG] Found ${subUsers.length} subusers for manager: ${id}`);
        res.status(200).json({
            success: true,
            parent: parentUser,
            subUsers
        });
    } catch (error) {
        console.error('[ERROR] GET /api/users/parent/:id ->', error);
        res.status(500).json({ success: false, message: 'Server error' });
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

/* ============================================================
   DEVICES CONFIG
============================================================ */

/*
  Add device
*/
router.post('/api/device', async (req, res) => {
    console.log('[DEBUG] POST /api/device -> req.body:', req.body);
    logDbState('/api/device');
    const device = req.body;

    if (!device.device_name || !device.device_type || !device.status) {
        console.log('[DEBUG] Missing required device fields');
        return res
            .status(400)
            .json({ success: false, message: 'Please enter all fields' });
    }

    const newDevice = new Device(device);

    try {
        await newDevice.save();
        console.log('[DEBUG] Created new device:', newDevice._id);
        res.status(201).json({ success: true, data: newDevice });
    } catch (error) {
        console.error('[ERROR] POST /api/device ->', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

/*
  Delete device by id
*/
router.delete('/api/device/:id', async (req, res) => {
    console.log('[DEBUG] DELETE /api/device/:id ->', req.params);
    logDbState('/api/device/:id');
    const { id } = req.params;

    try {
        const device = await Device.findByIdAndDelete(id);
        if (!device) {
            console.log(`[DEBUG] Device not found with id: ${id}`);
            return res.status(404).json({ success: false, message: 'Device not found' });
        }
        console.log(`[DEBUG] Deleted device with id: ${id}`);
        res.status(200).json({ success: true, message: 'Device deleted successfully' });
    } catch (error) {
        console.error('[ERROR] DELETE /api/device/:id ->', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

/*
  Get the list of devices from a JSON file
*/
router.get('/api/devices', (req, res) => {
    console.log('[DEBUG] GET /api/devices -> reading devicesFile:', devicesFile);
    fs.readFile(devicesFile, 'utf8', (err, data) => {
        if (err) {
            console.error('[ERROR] Reading devices.json ->', err);
            return res.status(500).json({ error: 'Failed to read devices.json' });
        }
        try {
            const devices = JSON.parse(data);
            console.log(`[DEBUG] /api/devices -> found ${devices.length} devices in JSON`);
            res.json(devices);
        } catch (error) {
            console.error('[ERROR] Parsing devices.json ->', error);
            res.status(500).json({ error: 'Invalid JSON format in devices.json' });
        }
    });
});

/*
  Update the status of a specific device
*/
router.post('/api/update-device', (req, res) => {
    console.log('[DEBUG] POST /api/update-device -> req.body:', req.body);
    if (!req.body || typeof req.body.name !== 'string' || typeof req.body.status !== 'boolean') {
        console.log('[DEBUG] Invalid update-device body');
        return res.status(400).json({
            error: "Invalid request format. 'name' must be a string and 'status' must be a boolean."
        });
    }

    const { name, status } = req.body;

    fs.readFile(devicesFile, 'utf8', (err, data) => {
        if (err) {
            console.error('[ERROR] Reading devices.json ->', err);
            return res.status(500).json({ error: 'Failed to read devices.json' });
        }

        try {
            let devices = JSON.parse(data);
            let device = devices.find(d => d.name === name);
            if (!device) {
                console.log(`[DEBUG] Device not found with name: ${name}`);
                return res.status(404).json({ error: 'Device not found' });
            }

            // Update the device status
            device.status = status;
            console.log(`[DEBUG] Updating device '${name}' status to: ${status}`);

            // Save back to the file
            fs.writeFile(devicesFile, JSON.stringify(devices, null, 4), err => {
                if (err) {
                    console.error('[ERROR] Writing devices.json ->', err);
                    return res.status(500).json({ error: 'Failed to update devices.json' });
                }
                res.json({ success: true, updatedDevice: device });
            });
        } catch (error) {
            console.error('[ERROR] Parsing devices.json ->', error);
            res.status(500).json({ error: 'Invalid JSON format in devices.json' });
        }
    });
});

/*
  Update the temperature of a specific AC device
*/
router.post('/api/update-temperature', (req, res) => {
    console.log('[DEBUG] POST /api/update-temperature -> req.body:', req.body);
    if (!req.body || typeof req.body.name !== 'string' || typeof req.body.temperature !== 'number') {
        console.log('[DEBUG] Invalid update-temperature body');
        return res.status(400).json({
            error: "Invalid request format. 'name' must be a string and 'temperature' must be a number."
        });
    }

    const { name, temperature } = req.body;

    fs.readFile(devicesFile, 'utf8', (err, data) => {
        if (err) {
            console.error('[ERROR] Reading devices.json ->', err);
            return res.status(500).json({ error: 'Failed to read devices.json' });
        }

        try {
            let devices = JSON.parse(data);
            let device = devices.find(d => d.name === name && d.type === 'AC');
            if (!device) {
                console.log(`[DEBUG] AC device not found with name: ${name}`);
                return res.status(404).json({ error: 'AC device not found' });
            }

            // Update the device temperature
            device.temperature = temperature;
            console.log(`[DEBUG] Updated AC device '${name}' temperature to: ${temperature}`);

            // Save the updated data back to JSON
            fs.writeFile(devicesFile, JSON.stringify(devices, null, 4), err => {
                if (err) {
                    console.error('[ERROR] Writing devices.json ->', err);
                    return res.status(500).json({ error: 'Failed to update devices.json' });
                }
                res.json({ success: true, updatedDevice: device });
            });
        } catch (error) {
            console.error('[ERROR] Parsing devices.json ->', error);
            res.status(500).json({ error: 'Invalid JSON format in devices.json' });
        }
    });
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

/*
  Get energy usage data
*/
router.get('/api/energy-usage', async (req, res) => {
    console.log('[DEBUG] GET /api/energy-usage');
    logDbState('/api/energy-usage');
    try {
        // Check if Mongoose is connected
        if (mongoose.connection.readyState !== 1) {
            console.log('[DEBUG] Mongoose not connected, returning 500');
            return res.status(500).json({ error: 'Database not connected' });
        }

        // Fetch all documents from EnergyUsage
        const energyData = await EnergyUsage.find().sort({ date: 1 });
        console.log(`[DEBUG] Fetched ${energyData.length} energy records`);

        if (!Array.isArray(energyData) || !energyData.length) {
            console.log('[DEBUG] No energy usage data found in the collection');
            return res.status(404).json({ error: 'No energy usage data found' });
        }

        // Return them as JSON
        res.json(energyData);
    } catch (error) {
        console.error('[ERROR] GET /api/energy-usage ->', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
