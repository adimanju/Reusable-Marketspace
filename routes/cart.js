const express = require('express');
const router = express.Router();
const CartService = require('../services/CartService');
const { protect } = require('../middleware-authjs');

/**
 * @route   GET /api/cart
 * @desc    Get user's cart
 * @access  Private
 */
router.get('/', protect, async (req, res) => {
    try {
        const cartSummary = await CartService.getCartSummary(req.user.id);
        res.json({
            success: true,
            data: cartSummary
        });
    } catch (error) {
        console.error('Get Cart Error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @route   POST /api/cart/add
 * @desc    Add item to cart
 * @access  Private
 */
router.post('/add', protect, async (req, res) => {
    try {
        const { productId, quantity } = req.body;

        if (!productId || !quantity || quantity < 1) {
            return res.status(400).json({
                success: false,
                message: 'Product ID and valid quantity are required'
            });
        }

        const updatedCart = await CartService.addToCart(req.user.id, productId, quantity);
        res.json({
            success: true,
            message: 'Item added to cart',
            data: updatedCart
        });
    } catch (error) {
        console.error('Add to Cart Error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @route   PUT /api/cart/update
 * @desc    Update cart item quantity
 * @access  Private
 */
router.put('/update', protect, async (req, res) => {
    try {
        const { productId, quantity } = req.body;

        if (!productId || typeof quantity !== 'number') {
            return res.status(400).json({
                success: false,
                message: 'Product ID and quantity are required'
            });
        }

        const updatedCart = await CartService.updateQuantity(req.user.id, productId, quantity);
        res.json({
            success: true,
            message: 'Cart updated',
            data: updatedCart
        });
    } catch (error) {
        console.error('Update Cart Error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @route   DELETE /api/cart/remove/:productId
 * @desc    Remove item from cart
 * @access  Private
 */
router.delete('/remove/:productId', protect, async (req, res) => {
    try {
        const updatedCart = await CartService.removeItem(req.user.id, req.params.productId);
        res.json({
            success: true,
            message: 'Item removed from cart',
            data: updatedCart
        });
    } catch (error) {
        console.error('Remove from Cart Error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @route   DELETE /api/cart/clear
 * @desc    Clear entire cart
 * @access  Private
 */
router.delete('/clear', protect, async (req, res) => {
    try {
        await CartService.clearCart(req.user.id);
        res.json({
            success: true,
            message: 'Cart cleared successfully'
        });
    } catch (error) {
        console.error('Clear Cart Error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;
