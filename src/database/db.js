import mongoose from 'mongoose';
import dotenv from "dotenv";
import fs from 'fs';
import EnergyUsage from '../models/energy.model.js';

dotenv.config();

//function to insert data
export const insertData = async () => {
    try {
         // Clear existing data
        await EnergyUsage.deleteMany({});
        console.log("Existing data cleared!");

        const json_data = fs.readFileSync('./src/database/energy_usage.json','utf-8');
        let energyData = JSON.parse(json_data);

        energyData = energyData.map(entry=>({
            date:new Date(entry.date), //convert string to date object
            energyusage: entry.energyusage
        }));
        await EnergyUsage.insertMany(energyData);
        console.log("data inserted successfully!");

        mongoose.connection.close(); //close connection after inserting
    } catch (error) {
        console.error(`error inserting data: ${error.message}`);
        process.exit(1);
    }
};

export const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1); //code 1 means exit with error
    }
};
