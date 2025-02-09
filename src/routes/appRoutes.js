const express = require("express");
const path = require("path");
const fs = require("fs");

const router = express.Router();
router.use(express.json()); // Ensure JSON request body is parsed

const devicesFile = path.join(__dirname, "../public/exampleData/device.json");

// 1️Serve the main HTML page
router.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../public/pages/loginPage.html"));
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

module.exports = router;