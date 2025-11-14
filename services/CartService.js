const { pool } = require('../database/config');
const { v4: uuidv4 } = require('uuid');

class CartService {
    // Get or create cart for a user
    async getOrCreateCart(userId) {
        try {
            const [existingCart] = await pool.query(
                'SELECT * FROM shopping_carts WHERE user_id = ?',
                [userId]
            );

            if (existingCart.length > 0) {
                return existingCart[0];
            }

            const cartId = uuidv4();
            await pool.query(
                'INSERT INTO shopping_carts (id, user_id) VALUES (?, ?)',
                [cartId, userId]
            );

            return { id: cartId, user_id: userId };
        } catch (error) {
            throw new Error('Failed to get or create cart: ' + error.message);
        }
    }

    // Add item to cart
    async addToCart(userId, productId, quantity) {
        try {
            // Get product details
            const [product] = await pool.query(
                'SELECT id, vendor_id, price, quantity as stock FROM products WHERE id = ?',
                [productId]
            );

            if (product.length === 0) {
                throw new Error('Product not found');
            }

            // Check stock availability
            if (product[0].stock < quantity) {
                throw new Error('Insufficient stock');
            }

            // Get or create cart
            const cart = await this.getOrCreateCart(userId);

            // Check if item already exists in cart
            const [existingItem] = await pool.query(
                'SELECT * FROM cart_items WHERE cart_id = ? AND product_id = ?',
                [cart.id, productId]
            );

            if (existingItem.length > 0) {
                // Update quantity
                await pool.query(
                    'UPDATE cart_items SET quantity = quantity + ?, updated_at = NOW() WHERE cart_id = ? AND product_id = ?',
                    [quantity, cart.id, productId]
                );
            } else {
                // Add new item
                const cartItemId = uuidv4();
                await pool.query(
                    'INSERT INTO cart_items (id, cart_id, product_id, vendor_id, quantity, price_at_time) VALUES (?, ?, ?, ?, ?, ?)',
                    [cartItemId, cart.id, productId, product[0].vendor_id, quantity, product[0].price]
                );
            }

            return await this.getCartItems(userId);
        } catch (error) {
            throw new Error('Failed to add item to cart: ' + error.message);
        }
    }

    // Get cart items with product details
    async getCartItems(userId) {
        try {
            const [cart] = await pool.query(
                'SELECT id FROM shopping_carts WHERE user_id = ?',
                [userId]
            );

            if (cart.length === 0) {
                return [];
            }

            const [items] = await pool.query(`
                SELECT 
                    ci.*,
                    p.name,
                    p.description,
                    p.category,
                    v.business_name as vendor_name
                FROM cart_items ci
                JOIN products p ON ci.product_id = p.id
                JOIN vendors v ON ci.vendor_id = v.id
                WHERE ci.cart_id = ?
            `, [cart[0].id]);

            return items.map(item => ({
                id: item.id,
                productId: item.product_id,
                vendorId: item.vendor_id,
                vendorName: item.vendor_name,
                name: item.name,
                category: item.category,
                quantity: item.quantity,
                price: item.price_at_time,
                subtotal: item.quantity * item.price_at_time
            }));
        } catch (error) {
            throw new Error('Failed to get cart items: ' + error.message);
        }
    }

    // Update cart item quantity
    async updateQuantity(userId, productId, quantity) {
        try {
            const [cart] = await pool.query(
                'SELECT id FROM shopping_carts WHERE user_id = ?',
                [userId]
            );

            if (cart.length === 0) {
                throw new Error('Cart not found');
            }

            if (quantity <= 0) {
                // Remove item if quantity is 0 or negative
                await pool.query(
                    'DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?',
                    [cart[0].id, productId]
                );
            } else {
                // Check product stock
                const [product] = await pool.query(
                    'SELECT quantity as stock FROM products WHERE id = ?',
                    [productId]
                );

                if (product.length === 0) {
                    throw new Error('Product not found');
                }

                if (product[0].stock < quantity) {
                    throw new Error('Insufficient stock');
                }

                // Update quantity
                await pool.query(
                    'UPDATE cart_items SET quantity = ?, updated_at = NOW() WHERE cart_id = ? AND product_id = ?',
                    [quantity, cart[0].id, productId]
                );
            }

            return await this.getCartItems(userId);
        } catch (error) {
            throw new Error('Failed to update cart item: ' + error.message);
        }
    }

    // Remove item from cart
    async removeItem(userId, productId) {
        try {
            const [cart] = await pool.query(
                'SELECT id FROM shopping_carts WHERE user_id = ?',
                [userId]
            );

            if (cart.length === 0) {
                throw new Error('Cart not found');
            }

            await pool.query(
                'DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?',
                [cart[0].id, productId]
            );

            return await this.getCartItems(userId);
        } catch (error) {
            throw new Error('Failed to remove item from cart: ' + error.message);
        }
    }

    // Clear cart
    async clearCart(userId) {
        try {
            const [cart] = await pool.query(
                'SELECT id FROM shopping_carts WHERE user_id = ?',
                [userId]
            );

            if (cart.length > 0) {
                await pool.query(
                    'DELETE FROM cart_items WHERE cart_id = ?',
                    [cart[0].id]
                );
            }

            return { success: true, message: 'Cart cleared successfully' };
        } catch (error) {
            throw new Error('Failed to clear cart: ' + error.message);
        }
    }

    // Get cart summary with totals
    async getCartSummary(userId) {
        try {
            const items = await this.getCartItems(userId);
            
            const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
            const gst = subtotal * 0.18; // 18% GST
            const total = subtotal + gst;

            return {
                items,
                itemCount: items.length,
                totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
                subtotal,
                gst,
                total
            };
        } catch (error) {
            throw new Error('Failed to get cart summary: ' + error.message);
        }
    }
}

module.exports = new CartService();