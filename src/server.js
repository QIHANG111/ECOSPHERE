// server.js
import dotenv from 'dotenv';
import app from './app.js';
import { connectDB, insertData } from './database/db.js';

dotenv.config();

const PORT = process.env.PORT || 4000;

async function startServer() {
    try {
        console.log('[DEBUG] Starting server...');

        // Connect to the database
        await connectDB();
        console.log('[DEBUG] Database connected successfully.');

        // Optional: Insert some initial data if you want
        await insertData();
        console.log('[DEBUG] Initial data inserted (if needed).');

        // Finally, start listening on the specified port
        app.listen(PORT, () => {
            console.log(`[DEBUG] Server is running at http://localhost:${PORT}`);
        });

    } catch (error) {
        console.error('[ERROR] Error starting server:', error);
        process.exit(1);
    }
}

startServer();
