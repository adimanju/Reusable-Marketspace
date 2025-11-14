const express = require('express');
const router = express.Router();

// Minimal vendors stub
router.get('/', (req, res) => {
    res.json({ success: true, message: 'Vendors routes stub' });
});

module.exports = router;
