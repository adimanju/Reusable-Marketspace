const express = require('express');
const router = express.Router();

// Minimal admin stub
router.get('/', (req, res) => {
    res.json({ success: true, message: 'Admin routes stub' });
});

module.exports = router;
