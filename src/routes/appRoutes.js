import express  from 'express';
import path from 'node:path';
import * as fs from 'node:fs';
import EnergyUsage from "../models/energy.model.js";
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import  User  from "../models/user.model.js";
import Device from "../models/device.model.js";
import bcrypt from 'bcryptjs';
import Room from '../models/room.model.js';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const devicesFile = path.join(__dirname, "../public/exampleData/device.json");

const router = express.Router();

router.use(express.json()); // Ensure JSON request body is parsed

/*API endpoints. Have to make it so that it reads from mongodb, instead of the exampleData folder */

// 1️Serve the main HTML page
router.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../public/pages/homePage.html"));
});

// 2️Example API endpoint to fetch from MongoDB
router.get("/api/users", async (req, res) => {
    try {
        const users = await User.find(); //fetch all users from mongoDb, retrieve all documents from user with find()
        res.json(users); //Return the users as a JSON response
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch user data from database" });
    }
});

//sign up for an account
router.post("/api/signup", async (req, res) => {
    try {
        const { name, email, phone, password, role_id } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "This email is already registered" });
        }

        // hs psw
        const hashedPassword = await bcrypt.hash(password, 10);

        // new user
        const newUser = new User({
            name,
            email,
            phone,
            hashed_password: hashedPassword,
            role_id
        });
        await newUser.save();
        res.status(201).json({ message: "sign up successful!" });

    } catch (error) {
        console.error("error:", error);
        res.status(500).json({ message: "server error" });
    }
});

//sign into user account
router.post("/api/signin", async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }

        const isMatch = await bcrypt.compare(password, user.hashed_password);
        if (!isMatch) {
            return res.status(400).json({ message: "Incorrect password" });
        }

        // jwt
        const token = jwt.sign({ userId: user._id, email: user.email }, SECRET_KEY, { expiresIn: "1h" });

        res.status(200).json({ message: "sign in successfully", token, user });

    } catch (error) {
        console.error("error:", error);
        res.status(500).json({ message: "server error" });
    }
});

/*user config(create, delete, get all users)*/

// Add new user to an already registered account
router.post("/api/subusers", async (req, res) => {
    try {
        const { name, phone, role_id, mainUserEmail } = req.body;

        // Validate required fields
        if (!name || !phone || !role_id || !mainUserEmail) {
            return res.status(400).json({ success: false, message: 'Please enter all fields: name, phone, roleID, and main user email' });
        }

        // Verify that the main user exists in the database using the email field
        const mainUser = await User.findOne({ email: mainUserEmail });
        if (!mainUser) {
            return res.status(400).json({ success: false, message: 'Main user not found' });
        }

        // Create a new sub-user instance, associating it with the main user's id
        const newSubUser = new User({
            name,
            phone,
            roleID,
            parentUser: mainUser._id // Associate with main user's MongoDB id
        });

        // Save the new sub-user to the database
        await newSubUser.save();
        res.status(201).json({ success: true, message: 'Sub-user created successfully', data: newSubUser });
    } catch (error) {
        console.error("Error creating sub-user:", error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

//delete user, if main, delete subs too, else delete just the user
const mainRole = "manager";
const subRole = "dweller";

router.delete("/api/users/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const requestingUserRole = req.user && req.user.roleID; // authenticated user's role

        // Find the user to be deleted by the provided id
        const userToDelete = await User.findById(id);
        if (!userToDelete) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // If trying to delete a manager account, only allow if the requester is also a manager
        if (userToDelete.roleID === mainRole) {
            if (requestingUserRole !== mainRole) {
                return res.status(403).json({ success: false, message: "Only managers can delete a manager account." });
            }
            // Delete the manager and all associated dwellers (subusers)
            await User.deleteMany({
                $or: [
                    { _id: id },
                    { parentUser: id } 
                ]
            });
            return res.status(200).json({ success: true, message: "Manager and all associated dwellers have been deleted." });
        } else if (userToDelete.roleID === subRole) {
            // If it's a dweller account, delete only that subuser
            await User.findByIdAndDelete(id);
            return res.status(200).json({ success: true, message: "Dweller has been deleted." });
        } else {
            // Fallback: if roleID is not recognized, simply delete the user
            await User.findByIdAndDelete(id);
            return res.status(200).json({ success: true, message: "User has been deleted." });
        }
    } catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

//get all users under a certain manager
router.get("/api/users/parent/:id", async (req, res) => {
    try {
        const { id } = req.params;

        // Find the parent user (manager) by id
        const parentUser = await User.findById(id);
        if (!parentUser) {
            return res.status(404).json({ success: false, message: "Parent user not found" });
        }

        // Find all subusers (dwellers) associated with the parent user
        const subUsers = await User.find({ parentUser: id });

        // Return the parent user and its subusers
        res.status(200).json({
            success: true,
            parent: parentUser,
            subUsers
        });
    } catch (error) {
        console.error("Error fetching users for parent:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// get all users in database
router.get("/api/allusers", async (req, res) => {
    try {
        // Retrieve all users from the database
        const users = await User.find();
        res.status(200).json({ success: true, users });
    } catch (error) {
        console.error("Error fetching all users:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});


/* Devices config*/

//add device
router.post("/api/device", async (req,res) =>{
    const device = req.body;

    if(!device.device_name  || !device.device_type || !device.status) {
        return res.status(400).json({ success:false, message: 'please enter all fields'});
    }

    const newDevice = new Device(device);

    try{
        await newDevice.save();
        res.status(201).json({ success: true, data: newDevice});
    }catch(error){
        console.error("Error in creating user", error.message);
        res.status(500).json({success: false, message: "Server Error"});
    }
});

//delete device
router.delete("/api/device/:id", async (req, res) => {
    const { id } = req.params;

    try {
        const device = await Device.findByIdAndDelete(id);

        if (!device) {
            return res.status(404).json({ success: false, message: "Device not found" });
        }

        res.status(200).json({ success: true, message: "Device deleted successfully" });
    } catch (error) {
        console.error("Error in deleting device", error.message);
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// Get the list of devices and their status
router.get("/api/devices", (req, res) => {
    fs.readFile(devicesFile, "utf8", (err, data) => {
        if (err) {
            return res.status(500).json({ error: "Failed to read devices.json" });
        }
        try {
            const devices = JSON.parse(data);
            res.json(devices);
        } catch (error) {
            res.status(500).json({ error: "Invalid JSON format in devices.json" });
        }
    });
});

// Update the status of a specific device
router.post("/api/update-device", (req, res) => {
    console.log("Received request body:", req.body); // Debugging: Check if body is received

    if (!req.body || typeof req.body.name !== "string" || typeof req.body.status !== "boolean") {
        return res.status(400).json({ error: "Invalid request format. 'name' must be a string and 'status' must be a boolean." });
    }

    const { name, status } = req.body;

    fs.readFile(devicesFile, "utf8", (err, data) => {
        if (err) {
            return res.status(500).json({ error: "Failed to read devices.json" });
        }

        try {
            let devices = JSON.parse(data);
            let device = devices.find(d => d.name === name);
            if (!device) {
                return res.status(404).json({ error: "Device not found" });
            }

            // Update the device status
            device.status = status;

            // Save the updated data back to the JSON file
            fs.writeFile(devicesFile, JSON.stringify(devices, null, 4), (err) => {
                if (err) {
                    return res.status(500).json({ error: "Failed to update devices.json" });
                }
                res.json({ success: true, updatedDevice: device });
            });
        } catch (error) {
            res.status(500).json({ error: "Invalid JSON format in devices.json" });
        }
    });
});

// Update the temperature of a specific AC device
router.post("/api/update-temperature", (req, res) => {
    console.log("Received temperature update request:", req.body);

    if (!req.body || typeof req.body.name !== "string" || typeof req.body.temperature !== "number") {
        return res.status(400).json({ error: "Invalid request format. 'name' must be a string and 'temperature' must be a number." });
    }

    const { name, temperature } = req.body;

    fs.readFile(devicesFile, "utf8", (err, data) => {
        if (err) {
            return res.status(500).json({ error: "Failed to read devices.json" });
        }

        try {
            let devices = JSON.parse(data);
            let device = devices.find(d => d.name === name && d.type === "AC");
            if (!device) {
                return res.status(404).json({ error: "AC device not found" });
            }

            // Update the device temperature
            device.temperature = temperature;

            // Save the updated data back to the JSON file
            fs.writeFile(devicesFile, JSON.stringify(devices, null, 4), (err) => {
                if (err) {
                    return res.status(500).json({ error: "Failed to update devices.json" });
                }
                res.json({ success: true, updatedDevice: device });
            });
        } catch (error) {
            res.status(500).json({ error: "Invalid JSON format in devices.json" });
        }
    });
});

/* Rooms config */

//add room
router.post("/api/rooms", async (req, res) => {
    try {
        const { room_name, room_type } = req.body;

        if (!room_name || !room_type) {
            return res.status(400).json({error: "All fields are required"});
        }

        const newRoom = new Room ({ room_name, room_type});
        await newRoom.save();

        res.status(201).json({message: "Room added successfully", room: newRoom});
    } catch (error) {
        res.status(500).json({error: "Failed to add room"});
    }
});

//delete room 
router.delete("/api/rooms/:id", async (req, res) =>{
    try {
        const { id } = req.params;

        //check if room exists
        const room = await Room.findById(id);
        if(!room){
            return res.status(404).json({error: "Room not found"});
        }

        await Room.findByIdAndDelete(id);
        res.json({message: "Room deleted successfully"});
    } catch (error) {
        res.status(500).json({ error: "Failed to delete room"});
    }
});

// get energy usage data
router.get("/api/energy-usage", async (req, res) => {
    try {
        if (mongoose.connection.readyState!==1){ //1 = connected
            return res.status(500).json({error: "Database not connected"});
        }

        const energyData = await EnergyUsage.find().sort({ date: 1 });

        if (!energyData.length) {
            return res.status(404).json({ error: "No energy usage data found" });
        }

        res.json(energyData);
    } catch (error) {
        console.error("Error fetching energy usage data:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

export default router;