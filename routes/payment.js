// routes/payment.js - Razorpay Payment Gateway Integration (copied from root implementation)
const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require('../models-Order');
const Product = require('../models-Product');
const { protect } = require('../middleware-authjs');

// Initialize Razorpay instance
const razorpay = new Razorpay({
	key_id: process.env.RAZORPAY_KEY_ID,
	key_secret: process.env.RAZORPAY_KEY_SECRET
});

/**
 * @route   POST /api/payment/create-order
 * @desc    Create Razorpay order
 * @access  Private
 */
router.post('/create-order', protect, async (req, res) => {
	try {
		const { items, shippingAddress } = req.body;

		// Validate items
		if (!items || items.length === 0) {
			return res.status(400).json({
				success: false,
				message: 'Cart is empty'
			});
		}

		// Calculate order amount
		let subtotal = 0;
		const orderItems = [];

		for (const item of items) {
			const product = await Product.findById(item.productId)
				.populate('vendor', 'businessName');

			if (!product) {
				return res.status(404).json({
					success: false,
					message: `Product ${item.productId} not found`
				});
			}

			// Check quantity availability
			if (product.quantity < item.quantity) {
				return res.status(400).json({
					success: false,
					message: `Insufficient stock for ${product.name}`
				});
			}

			// Check minimum order quantity
			if (item.quantity < product.minOrderQuantity) {
				return res.status(400).json({
					success: false,
					message: `Minimum order quantity for ${product.name} is ${product.minOrderQuantity}`
				});
			}

			const itemSubtotal = product.price * item.quantity;
			subtotal += itemSubtotal;

			orderItems.push({
				product: product._id,
				vendor: product.vendor._id,
				name: product.name,
				price: product.price,
				quantity: item.quantity,
				subtotal: itemSubtotal
			});
		}

		// Calculate GST (18%)
		const gst = subtotal * 0.18;
		const total = subtotal + gst;

		// Create Razorpay order
		const razorpayOrder = await razorpay.orders.create({
			amount: Math.round(total * 100), // Amount in paise
			currency: 'INR',
			receipt: `rcpt_${Date.now()}`,
			notes: {
				customerId: req.user._id.toString(),
				orderType: 'bulk_electronics'
			}
		});

		// Create order in database
		const order = await Order.create({
			customer: req.user._id,
			items: orderItems,
			pricing: {
				subtotal,
				gst,
				total
			},
			shippingAddress,
			payment: {
				method: req.body.paymentMethod || 'upi',
				razorpayOrderId: razorpayOrder.id,
				status: 'pending'
			}
		});

		res.status(201).json({
			success: true,
			message: 'Order created successfully',
			data: {
				orderId: order._id,
				orderNumber: order.orderNumber,
				razorpayOrder: {
					id: razorpayOrder.id,
					amount: razorpayOrder.amount,
					currency: razorpayOrder.currency,
					key: process.env.RAZORPAY_KEY_ID
				},
				pricing: {
					subtotal,
					gst,
					total
				}
			}
		});

	} catch (error) {
		console.error('Create Order Error:', error);
		res.status(500).json({
			success: false,
			message: 'Failed to create order',
			error: error.message
		});
	}
});

/**
 * @route   POST /api/payment/verify
 * @desc    Verify Razorpay payment signature
 * @access  Private
 */
router.post('/verify', protect, async (req, res) => {
	try {
		const {
			razorpay_order_id,
			razorpay_payment_id,
			razorpay_signature,
			orderId
		} = req.body;

		// Verify signature
		const body = razorpay_order_id + '|' + razorpay_payment_id;
		const expectedSignature = crypto
			.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
			.update(body.toString())
			.digest('hex');

		const isValid = expectedSignature === razorpay_signature;

		if (!isValid) {
			return res.status(400).json({
				success: false,
				message: 'Invalid payment signature'
			});
		}

		// Update order payment status
		const order = await Order.findById(orderId);
        
		if (!order) {
			return res.status(404).json({
				success: false,
				message: 'Order not found'
			});
		}

		order.payment.razorpayPaymentId = razorpay_payment_id;
		order.payment.razorpaySignature = razorpay_signature;
		order.payment.status = 'completed';
		order.payment.paidAt = new Date();
		order.orderStatus = 'confirmed';
		order.statusHistory.push({
			status: 'confirmed',
			timestamp: new Date(),
			note: 'Payment verified and order confirmed'
		});

		await order.save();

		// Update product quantities
		for (const item of order.items) {
			await Product.findByIdAndUpdate(item.product, {
				$inc: {
					quantity: -item.quantity,
					'statistics.orders': 1,
					'statistics.totalSold': item.quantity
				}
			});
		}

		res.json({
			success: true,
			message: 'Payment verified successfully',
			data: {
				orderNumber: order.orderNumber,
				status: order.orderStatus,
				paidAmount: order.pricing.total
			}
		});

	} catch (error) {
		console.error('Payment Verification Error:', error);
		res.status(500).json({
			success: false,
			message: 'Payment verification failed',
			error: error.message
		});
	}
});

/**
 * @route   POST /api/payment/webhook
 * @desc    Razorpay webhook for payment events
 * @access  Public
 */
router.post('/webhook', async (req, res) => {
	try {
		const webhookSignature = req.headers['x-razorpay-signature'];
		const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

		// Verify webhook signature
		const expectedSignature = crypto
			.createHmac('sha256', webhookSecret)
			.update(JSON.stringify(req.body))
			.digest('hex');

		if (webhookSignature !== expectedSignature) {
			return res.status(400).json({ message: 'Invalid signature' });
		}

		const event = req.body.event;
		const payload = req.body.payload;

		// Handle different event types
		switch (event) {
			case 'payment.captured':
				// Payment successful
				const order = await Order.findOne({
					'payment.razorpayOrderId': payload.payment.entity.order_id
				});
                
				if (order) {
					order.payment.status = 'completed';
					order.orderStatus = 'confirmed';
					await order.save();
				}
				break;

			case 'payment.failed':
				// Payment failed
				const failedOrder = await Order.findOne({
					'payment.razorpayOrderId': payload.payment.entity.order_id
				});
                
				if (failedOrder) {
					failedOrder.payment.status = 'failed';
					failedOrder.payment.failureReason = payload.payment.entity.error_description;
					await failedOrder.save();
				}
				break;

			default:
				console.log('Unhandled webhook event:', event);
		}

		res.json({ received: true });

	} catch (error) {
		console.error('Webhook Error:', error);
		res.status(500).json({ message: 'Webhook processing failed' });
	}
});

/**
 * @route   POST /api/payment/refund
 * @desc    Initiate refund
 * @access  Private (Admin)
 */
router.post('/refund', protect, async (req, res) => {
	try {
		const { orderId, amount, reason } = req.body;

		const order = await Order.findById(orderId);

		if (!order) {
			return res.status(404).json({
				success: false,
				message: 'Order not found'
			});
		}

		if (order.payment.status !== 'completed') {
			return res.status(400).json({
				success: false,
				message: 'Payment not completed, cannot refund'
			});
		}

		// Create refund via Razorpay
		const refund = await razorpay.payments.refund(
			order.payment.razorpayPaymentId,
			{
				amount: amount * 100, // Amount in paise
				notes: {
					reason: reason || 'Refund requested by admin'
				}
			}
		);

		// Update order
		order.payment.status = 'refunded';
		order.orderStatus = 'cancelled';
		order.cancelReason = reason;
		await order.save();

		res.json({
			success: true,
			message: 'Refund initiated successfully',
			data: {
				refundId: refund.id,
				amount: refund.amount / 100,
				status: refund.status
			}
		});

	} catch (error) {
		console.error('Refund Error:', error);
		res.status(500).json({
			success: false,
			message: 'Refund failed',
			error: error.message
		});
	}
});

module.exports = router;

