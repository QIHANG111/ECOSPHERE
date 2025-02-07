const express = require('express');
const path = require('path');
const router = express.Router();

// Route to serve the HTML page
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/pages/loginPage.html'));
});

// Example API endpoint to get mock data
router.get('/api/users', (req, res) => {
    const users = require('../data/users.json');
    res.json(users);
});

module.exports = router;