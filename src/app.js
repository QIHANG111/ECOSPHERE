import express from 'express';
import path from 'node:path';
import appRoutes from './routes/appRoutes.js';

const app = express();

import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.use(express.static(path.join(__dirname, 'public')));

// Middleware to serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Use routes
app.use('/', appRoutes);


export default app;