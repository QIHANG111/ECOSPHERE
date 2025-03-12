import mongoose from 'mongoose';
import dotenv from "dotenv";
import fs from 'fs';
import EnergyUsage from '../models/energy.model.js';
import { faker } from '@faker-js/faker'; 

dotenv.config();

//function to insert data
export const insertData = async (count = 60 ) => {
    try {
        let energyData = [];

         // Clear existing data
        await EnergyUsage.deleteMany({});
        console.log("Existing data cleared!");

        for (let i = 0; i<count; i++){
            energyData.push({
                date: faker.date.past(),
                energyusage: faker.number.float({min: 70, max: 90, precision: 5})
            });
        }

        await EnergyUsage.insertMany(energyData);
          console.log(`${count} data inserted successfully!`);

    } catch (error) {
        console.error(`error inserting data: ${error.message}`);
        process.exit(1);
    } finally {
        mongoose.connection.close(); //close connection after inserting
    }
};

export const connectDB = async () => {
    if(mongoose.connection.readyState!==0){ //if already connected, return
        console.log("MongoDB already connected");
        return;
    }

    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1); //code 1 means exit with error
    }
};
