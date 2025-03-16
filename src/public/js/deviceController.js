const fs = require("fs");
const path = require("path");

const devicesFile = path.join(__dirname, "device.json");

// 读取设备数据
function readDevices() {
    try {
        const data = fs.readFileSync(devicesFile, "utf8");
        return JSON.parse(data);
    } catch (error) {
        console.error("[ERROR] Reading devices.json:", error);
        return [];
    }
}

// 写入设备数据
function writeDevices(devices) {
    try {
        fs.writeFileSync(devicesFile, JSON.stringify(devices, null, 4), "utf8");
        return true;
    } catch (error) {
        console.error("[ERROR] Writing devices.json:", error);
        return false;
    }
}

// 1️⃣ 获取所有设备
function getAllDevices() {
    return readDevices();
}

// 2️⃣ 获取设备状态
function getStatus(deviceId) {
    const device = readDevices().find(d => d.id === deviceId);
    return device ? device.status : null;
}

// 3️⃣ 切换设备开关
function toggleStatus(deviceId) {
    const devices = readDevices();
    const device = devices.find(d => d.id === deviceId);
    if (!device) return { error: "Device not found" };

    device.status = !device.status;
    writeDevices(devices);
    return { success: true, status: device.status };
}


// 7️⃣ 设置风扇或 AC 风速
function setFanSpeed(deviceId, speed) {
    const devices = readDevices();
    const device = devices.find(d => d.id === deviceId && ["AC", "fan"].includes(d.type));
    if (!device) return { error: "Fan or AC device not found" };

    if (speed < 1 || speed > 5) return { error: "Fan speed must be between 1-5" };

    device.fanSpeed = speed;
    writeDevices(devices);
    return { success: true, fanSpeed: speed };
}

// 8️⃣ 设置模式（适用于 AC、灯）
function setMode(deviceId, mode) {
    const devices = readDevices();
    const device = devices.find(d => d.id === deviceId && ["AC", "light"].includes(d.type));
    if (!device) return { error: "Device not found" };

    device.mode = mode;
    writeDevices(devices);
    return { success: true, mode };
}

// 9️⃣ 重置设备
function resetDevice(deviceId) {
    const devices = readDevices();
    const device = devices.find(d => d.id === deviceId);
    if (!device) return { error: "Device not found" };

    device.status = false;
    if (device.type === "AC") device.temperature = 24;
    if (device.type === "light") device.brightness = 50;
    delete device.timer;

    writeDevices(devices);
    return { success: true, message: "Device reset successfully" };
}

module.exports = {
    getAllDevices,
    getStatus,
    toggleStatus,
    setFanSpeed,
    setMode,
    resetDevice
};
