// routes/kyc.js - DigiLocker KYC Integration Routes (copied from root implementation)
const express = require('express');
const router = express.Router();
const axios = require('axios');
const crypto = require('crypto');
const Vendor = require('../models-Vendor');
const { protect, vendorOnly } = require('./middleware-authjs');

// DigiLocker Configuration
const DIGILOCKER_CONFIG = {
	clientId: process.env.DIGILOCKER_CLIENT_ID,
	clientSecret: process.env.DIGILOCKER_CLIENT_SECRET,
	redirectUri: process.env.DIGILOCKER_REDIRECT_URI,
	apiBase: process.env.DIGILOCKER_API_BASE || 'https://api.digitallocker.gov.in/public/oauth2',
	hmacKey: process.env.DIGILOCKER_HMAC_KEY
};

/**
 * @route   POST /api/kyc/initiate
 * @desc    Initiate DigiLocker KYC process
 * @access  Private (Vendor only)
 */
router.post('/initiate', protect, vendorOnly, async (req, res) => {
	try {
		const { businessName, contactNumber, businessAddress, gstin, aadhaarNumber } = req.body;

		// Validate required fields
		if (!businessName || !contactNumber || !businessAddress || !aadhaarNumber) {
			return res.status(400).json({
				success: false,
				message: 'All fields are required for KYC verification'
			});
		}

		// Update vendor with KYC details
		const vendor = await Vendor.findById(req.vendor._id);
		vendor.businessName = businessName;
		vendor.contactNumber = contactNumber;
		vendor.businessAddress = businessAddress;
		vendor.gstin = gstin;
		vendor.kycDetails.aadhaarNumber = aadhaarNumber;
		vendor.kycDetails.kycStatus = 'in_progress';
        
		await vendor.save();

		// Generate state parameter for OAuth
		const state = crypto.randomBytes(16).toString('hex');
        
		// Store state in session/database for verification
		// In production, use Redis or session storage
        
		// Build DigiLocker authorization URL
		const authUrl = `${DIGILOCKER_CONFIG.apiBase}/1/authorize?` +
			`response_type=code&` +
			`client_id=${DIGILOCKER_CONFIG.clientId}&` +
			`redirect_uri=${encodeURIComponent(DIGILOCKER_CONFIG.redirectUri)}&` +
			`state=${state}`;

		res.json({
			success: true,
			message: 'KYC initiation successful',
			data: {
				authUrl,
				state,
				vendor: {
					id: vendor._id,
					businessName: vendor.businessName,
					kycStatus: vendor.kycDetails.kycStatus
				}
			}
		});

	} catch (error) {
		console.error('KYC Initiation Error:', error);
		res.status(500).json({
			success: false,
			message: 'Failed to initiate KYC process',
			error: error.message
		});
	}
});

/**
 * @route   GET /api/kyc/digilocker/callback
 * @desc    DigiLocker OAuth callback handler
 * @access  Public
 */
router.get('/digilocker/callback', async (req, res) => {
	try {
		const { code, state } = req.query;

		if (!code) {
			return res.status(400).json({
				success: false,
				message: 'Authorization code not received'
			});
		}

		// Verify state parameter
		// In production, verify against stored state in session/database

		// Exchange authorization code for access token
		const tokenResponse = await axios.post(
			`${DIGILOCKER_CONFIG.apiBase}/1/token`,
			{
				code,
				grant_type: 'authorization_code',
				client_id: DIGILOCKER_CONFIG.clientId,
				client_secret: DIGILOCKER_CONFIG.clientSecret,
				redirect_uri: DIGILOCKER_CONFIG.redirectUri
			},
			{
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
			}
		);

		const { access_token, refresh_token } = tokenResponse.data;

		// Fetch Aadhaar document from DigiLocker
		const aadhaarUri = 'in.gov.uidai.aadhaar'; // Standard Aadhaar URI
		const documentResponse = await axios.post(
			`${DIGILOCKER_CONFIG.apiBase}/1/pull`,
			{
				uri: aadhaarUri
			},
			{
				headers: {
					'Authorization': `Bearer ${access_token}`,
					'Content-Type': 'application/json'
				}
			}
		);

		// Parse Aadhaar XML response
		const aadhaarData = parseAadhaarXML(documentResponse.data);

		// Update vendor KYC status
		// In production, match vendor by state parameter or session
		const vendor = await Vendor.findOne({ 'kycDetails.kycStatus': 'in_progress' });
        
		if (vendor) {
			vendor.kycDetails.aadhaarVerified = true;
			vendor.kycDetails.digilockerAccessToken = access_token;
			vendor.kycDetails.kycStatus = 'verified';
			vendor.kycDetails.verifiedAt = new Date();
			vendor.kycDetails.kycDocuments.push({
				documentType: 'aadhaar',
				documentUrl: 'digilocker',
				uploadedAt: new Date()
			});
            
			await vendor.save();
		}

		// Redirect to frontend with success message
		res.redirect(`${process.env.CLIENT_URL}/vendor/kyc/success`);

	} catch (error) {
		console.error('DigiLocker Callback Error:', error);
		res.redirect(`${process.env.CLIENT_URL}/vendor/kyc/failed`);
	}
});

/**
 * @route   GET /api/kyc/status
 * @desc    Get KYC verification status
 * @access  Private (Vendor only)
 */
router.get('/status', protect, vendorOnly, async (req, res) => {
	try {
		const vendor = await Vendor.findById(req.vendor._id);

		res.json({
			success: true,
			data: {
				kycStatus: vendor.kycDetails.kycStatus,
				aadhaarVerified: vendor.kycDetails.aadhaarVerified,
				verifiedAt: vendor.kycDetails.verifiedAt,
				isApprovedByAdmin: vendor.isApprovedByAdmin,
				documents: vendor.kycDetails.kycDocuments
			}
		});

	} catch (error) {
		console.error('KYC Status Error:', error);
		res.status(500).json({
			success: false,
			message: 'Failed to fetch KYC status',
			error: error.message
		});
	}
});

/**
 * Helper function to parse Aadhaar XML
 * In production, use proper XML parser like 'xml2js'
 */
function parseAadhaarXML(xmlData) {
	// Simplified parsing - implement proper XML parsing in production
	return {
		name: 'John Doe',
		dob: '1990-01-01',
		address: 'Sample Address',
		aadhaarNumber: 'XXXX-XXXX-XXXX'
	};
}

/**
 * @route   POST /api/kyc/verify-aadhaar
 * @desc    Direct Aadhaar verification (alternative to DigiLocker)
 * @access  Private (Vendor only)
 */
router.post('/verify-aadhaar', protect, vendorOnly, async (req, res) => {
	try {
		const { aadhaarNumber, otp } = req.body;

		// In production, integrate with UIDAI API or third-party services
		// like Karza, IDfy, or AuthBridge for Aadhaar verification

		// Simulated verification
		const isValid = aadhaarNumber.length === 12 && otp === '123456';

		if (isValid) {
			const vendor = await Vendor.findById(req.vendor._id);
			vendor.kycDetails.aadhaarNumber = aadhaarNumber;
			vendor.kycDetails.aadhaarVerified = true;
			vendor.kycDetails.kycStatus = 'verified';
			vendor.kycDetails.verifiedAt = new Date();
            
			await vendor.save();

			res.json({
				success: true,
				message: 'Aadhaar verified successfully',
				data: {
					kycStatus: vendor.kycDetails.kycStatus
				}
			});
		} else {
			res.status(400).json({
				success: false,
				message: 'Invalid Aadhaar or OTP'
			});
		}

	} catch (error) {
		console.error('Aadhaar Verification Error:', error);
		res.status(500).json({
			success: false,
			message: 'Aadhaar verification failed',
			error: error.message
		});
	}
});

module.exports = router;



