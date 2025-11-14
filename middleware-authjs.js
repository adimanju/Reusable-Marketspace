// middleware/auth.js - Authentication & Authorization Middleware
const jwt = require('jsonwebtoken');
const User = require('./models-User');
const Vendor = require('./models-Vendor');

/**
 * Protect routes - Verify JWT token
 */
exports.protect = async (req, res, next) => {
    try {
        let token;

        // Check for token in Authorization header
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized, no token provided'
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Check user type and attach to request
        if (decoded.type === 'customer') {
            req.user = await User.findById(decoded.id);
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'User not found'
                });
            }
        } else if (decoded.type === 'vendor') {
            req.vendor = await Vendor.findById(decoded.id);
            if (!req.vendor) {
                return res.status(401).json({
                    success: false,
                    message: 'Vendor not found'
                });
            }
        } else if (decoded.type === 'admin') {
            req.admin = decoded;
        }

        req.userType = decoded.type;
        next();

    } catch (error) {
        console.error('Auth Middleware Error:', error);
        res.status(401).json({
            success: false,
            message: 'Not authorized, token verification failed'
        });
    }
};

/**
 * Vendor only access
 */
exports.vendorOnly = (req, res, next) => {
    if (req.userType !== 'vendor') {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Vendor access only.'
        });
    }
    next();
};

/**
 * Admin only access
 */
exports.adminOnly = (req, res, next) => {
    if (req.userType !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Admin access only.'
        });
    }
    next();
};

/**
 * Customer only access
 */
exports.customerOnly = (req, res, next) => {
    if (req.userType !== 'customer') {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Customer access only.'
        });
    }
    next();
};

/**
 * Check if vendor KYC is verified
 */
exports.kycVerified = (req, res, next) => {
    if (!req.vendor || !req.vendor.isKycComplete()) {
        return res.status(403).json({
            success: false,
            message: 'KYC verification required to perform this action'
        });
    }
    next();
};

/**
 * Generate JWT token
 */
exports.generateToken = (id, type) => {
    return jwt.sign(
        { id, type },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
};
