import mongoose from 'mongoose';
import dotenv from "dotenv";
import EnergyUsage from '../models/energy.model.js';
import Permission from '../models/permission.model.js';
import Role from '../models/role.model.js';
import RolePermission from '../models/rolePermission.model.js';
import { faker } from '@faker-js/faker';
import fs from 'fs';
dotenv.config();

/**
 * Connect to MongoDB if not already connected.
 * Typically called once at the start of your application.
 */
export const connectDB = async () => {
    // If Mongoose is already connected (readyState=1) or connecting (readyState=2),
    // we do not attempt to re-connect.
    const { readyState } = mongoose.connection;
    if (readyState === 1 || readyState === 2) {
        console.log("MongoDB is already connected or connecting");
        return;
    }

    try {
        // Use the .env variable MONGO_URI for the connection string
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB connected to host: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Failed to connect MongoDB: ${error.message}`);
        process.exit(1);
    }
};

/**
 * Insert 'count' fake documents into the EnergyUsage collection.
 * This function does NOT close the DB connection afterward,
 * so your app can remain connected for subsequent requests.
 *
 * @param {number} count - how many records to insert (default: 60)
 */
export const insertData = async (count = 365) => {
    try {
        // Clear existing data
        await EnergyUsage.deleteMany({});
        console.log("Existing data cleared!");


        /*use the fake data at energy_usage.json first*/

        //
        // // Create an array of fake docs
        // const energyData = [];
        // for (let i = 0; i < count; i++) {
        //     energyData.push({
        //         date: faker.date.past(),
        //         energyusage: faker.number.float({ min: 70, max: 90, precision: 5 })
        //     });
        // }
        //
        // // Insert them in one go
        // await EnergyUsage.insertMany(energyData);
        // console.log(`${count} data inserted successfully!`);
    } catch (error) {
        console.error(`Error inserting data: ${error.message}`);
        process.exit(1);
    }
};
//365days mock data
export const insertDataFromJSON = async (filePath) => {
    try {

        const rawData = fs.readFileSync(filePath, 'utf8');
        const jsonData = JSON.parse(rawData);

        if (!Array.isArray(jsonData) || jsonData.length === 0) {
            throw new Error("Invalid JSON data: Must be a non-empty array.");
        }

        const formattedData = jsonData.map(item => ({
            date: new Date(item.date),
            energyusage: parseFloat(item.energyusage)
        }));


        await EnergyUsage.insertMany(formattedData);
        console.log(`${formattedData.length} records inserted from JSON file.`);
    } catch (error) {
        console.error(`Error inserting data from JSON: ${error.message}`);
        process.exit(1);
    }
};

const permissions = [
    "addDevice",
    "deleteDevice",
    "editDevice",
    "viewReport",
    "addRoom",
    "deleteRoom",
    "adjustTemp",
    "switchOn",
    "switchOff",
    "addUser",
    "deleteUser",
    "changeSettings",
    "updateSystem",
    "backupSystem"
];

const roles = [
    { role_name: "Home Dweller" },  // Basic user
    { role_name: "Home Owner" },    // Home owner with full control
    { role_name: "Developer" }      // Developer for system management
];

const rolePermissionsMapping = {
    "Home Dweller": ["switchOff", "viewReport"],
    "Home Owner": ["switchOn", "switchOff", "adjustTemp", "viewReport", "addDevice", "deleteDevice", "addRoom", "addUser", "editDevice", "changeSettings"],
    "Developer": ["switchOn", "switchOff", "adjustTemp", "viewReport", "addDevice", "deleteDevice", "addRoom", "addUser", "editDevice", "changeSettings", "updateSystem", "backupSystem"]
};

// export async function addPermissions() {
//     try {
//         // Insert permissions
//         const insertedPermissions = await Permission.insertMany(
//             permissions.map(name => ({ name }))
//         );

//         // Insert roles
//         const insertedRoles = await Role.insertMany(roles);

//         // Map role names to IDs
//         const permissionMap = Object.fromEntries(insertedPermissions.map(p => [p.name, p._id]));
//         const roleMap = Object.fromEntries(insertedRoles.map(r => [r.name, r._id]));

//         // Insert role-permission mappings
//         const rolePermissions = [];
//         for (const [roleName, permissionList] of Object.entries(rolePermissionsMapping)) {
//             const roleId = roleMap[roleName];
//             permissionList.forEach(permissionName => {
//                 rolePermissions.push({ role_id: roleId, permission_id: permissionMap[permissionName] });
//             });
//         }

//         await RolePermission.insertMany(rolePermissions);

//         console.log("Roles and permissions seeded successfully!");
//     } catch (error) {
//         console.error("Error serole_eding database:", error);
//     }
// }
export async function addPermissions() {
    try {
        //delete previous role permission
        await RolePermission.deleteMany({});
        await Role.deleteMany({});
        await Permission.deleteMany({});
        console.log('[DEBUG] Existing role permissions cleared!');

        // Insert permissions
        const insertedPermissions = await Permission.insertMany(
            permissions.map(name => ({ name }))
        );
        console.log('[DEBUG] Inserted permissions:', insertedPermissions);

        // Insert roles
        const insertedRoles = await Role.insertMany(roles);
        console.log('[DEBUG] Inserted roles:', insertedRoles);

        // Map role names to IDs
        const permissionMap = Object.fromEntries(insertedPermissions.map(p => [p.name, p._id]));
        const roleMap = Object.fromEntries(insertedRoles.map(r => [r.role_name, r._id]));

        // Insert role-permission mappings
        const rolePermissions = [];
        for (const [roleName, permissionList] of Object.entries(rolePermissionsMapping)) {
            const roleId = roleMap[roleName];
            permissionList.forEach(permissionName => {
                const permissionId = permissionMap[permissionName];
                if (!roleId || !permissionId) {
                    console.error(`[ERROR] Missing roleId or permissionId for role: ${roleName}, permission: ${permissionName}`);
                } else {
                    rolePermissions.push({ role_id: roleId, permission_id: permissionId });
                }
            });
        }

        console.log('[DEBUG] RolePermissions to be inserted:', rolePermissions);

        await RolePermission.insertMany(rolePermissions);

        console.log("Roles and permissions seeded successfully!");
    } catch (error) {
        console.error("Error seeding database:", error);
    }
}

/**
 * Optional function to close the connection.
 * Call this if you want to end the process or
 * if you're sure you no longer need the DB connection.
 */
export const closeDB = async () => {
    try {
        await mongoose.connection.close();
        console.log("MongoDB connection closed.");
    } catch (error) {
        console.error("Error closing MongoDB connection:", error);
    }
};
