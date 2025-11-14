const express = require('express');
const router = express.Router();

// Minimal orders stub
router.get('/', (req, res) => {
    res.json({ success: true, message: 'Orders routes stub' });
});

module.exports = router;
