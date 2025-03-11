import mongoose from "mongoose";

const EnergyUsageSchema = new mongoose.Schema({
    date: {
        type: Date, 
        required: true 
    },
    energyusage: {
        type: Number,
        required: true 
    }
});

const EnergyUsage = mongoose.model('EnergyUsage', EnergyUsageSchema);
export default EnergyUsage;
