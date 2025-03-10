import express  from 'express';
import path from 'node:path';
import * as fs from 'node:fs';
import EnergyUsage from "../models/EnergyUsage.js";
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import  User  from "../models/user.model.js";
import bcrypt from 'bcryptjs';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const devicesFile = path.join(__dirname, "../public/exampleData/device.json");

const router = express.Router();
router.use(express.json()); // Ensure JSON request body is parsed

// 1️Serve the main HTML page
router.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../public/pages/homePage.html"));
});


// 2️Example API endpoint to fetch mock user data
router.get("/api/users", (req, res) => {
    try {
        const users = require("../public/exampleData/data.json");
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch user data" });
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
router.get("/api/energy-usage", async (req, res) => {
    try {
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
        res.status(201).json({ message: "sign up successfully" });

    } catch (error) {
        console.error("error:", error);
        res.status(500).json({ message: "server error" });
    }
});

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



export default router;