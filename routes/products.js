const express = require('express');
const router = express.Router();

// Minimal products stub
router.get('/', (req, res) => {
    res.json({ success: true, message: 'Products routes stub' });
});

module.exports = router;
