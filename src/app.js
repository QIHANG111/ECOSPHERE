import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

// Routes
import appRoutes from './routes/appRoutes.js';

// Basic file path setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create the Express application
const app = express();

// Use JSON parsing
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Mount your routes at "/"
app.use('/', appRoutes);

// Export the app
export default app;
