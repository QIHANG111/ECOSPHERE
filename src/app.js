const express = require('express');
const path = require('path');
const appRoutes = require('./routes/appRoutes');

const app = express();

// Middleware to serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Use routes
app.use('/', appRoutes);

module.exports = app;