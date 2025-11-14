const express = require('express');
const router = express.Router();

// Minimal auth stub - replace with real implementation
router.get('/', (req, res) => {
    res.json({ success: true, message: 'Auth routes stub' });
});

module.exports = router;
