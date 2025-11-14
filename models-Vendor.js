// models/Vendor.js - Vendor Model with KYC Details
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const vendorSchema = new mongoose.Schema({
    businessName: {
        type: String,
        required: [true, 'Business name is required'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: 8,
        select: false
    },
    contactNumber: {
        type: String,
        required: [true, 'Contact number is required'],
        match: [/^[6-9]\d{9}$/, 'Please provide a valid Indian phone number']
    },
    gstin: {
        type: String,
        match: [/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GSTIN format']
    },
    businessAddress: {
        street: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        pincode: { type: String, required: true },
        country: { type: String, default: 'India' }
    },
    kycDetails: {
        aadhaarNumber: {
            type: String,
            select: false // Don't return in queries for security
        },
        aadhaarVerified: {
            type: Boolean,
            default: false
        },
        digilockerUid: String,
        digilockerAccessToken: {
            type: String,
            select: false
        },
        kycStatus: {
            type: String,
            enum: ['pending', 'in_progress', 'verified', 'rejected'],
            default: 'pending'
        },
        kycDocuments: [{
            documentType: String,
            documentUrl: String,
            uploadedAt: Date
        }],
        verifiedAt: Date,
        verifiedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Admin'
        }
    },
    isActive: {
        type: Boolean,
        default: false // Activated only after admin approval
    },
    isApprovedByAdmin: {
        type: Boolean,
        default: false
    },
    bankDetails: {
        accountHolderName: String,
        accountNumber: String,
        ifscCode: String,
        bankName: String
    },
    statistics: {
        totalProducts: { type: Number, default: 0 },
        totalOrders: { type: Number, default: 0 },
        totalRevenue: { type: Number, default: 0 }
    }
}, {
    timestamps: true
});

// Index for faster queries
vendorSchema.index({ email: 1 });
vendorSchema.index({ 'kycDetails.kycStatus': 1 });

// Hash password before saving
vendorSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Method to compare passwords
vendorSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Method to check if KYC is complete
vendorSchema.methods.isKycComplete = function() {
    return this.kycDetails.kycStatus === 'verified';
};

module.exports = mongoose.model('Vendor', vendorSchema);
