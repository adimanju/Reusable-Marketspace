// models/Product.js - Product Model
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    vendor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vendor',
        required: true
    },
    name: {
        type: String,
        required: [true, 'Product name is required'],
        trim: true
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
        enum: [
            'SD Cards',
            'Microcontrollers',
            'Sensors',
            'Display Modules',
            'Circuit Boards',
            'Power Supplies',
            'Other Electronics'
        ]
    },
    description: {
        type: String,
        required: [true, 'Description is required']
    },
    price: {
        type: Number,
        required: [true, 'Price is required'],
        min: [1, 'Price must be at least 1 rupee']
    },
    quantity: {
        type: Number,
        required: [true, 'Quantity is required'],
        min: [0, 'Quantity cannot be negative']
    },
    minOrderQuantity: {
        type: Number,
        required: [true, 'Minimum order quantity is required'],
        default: 10,
        min: [1, 'Minimum order must be at least 1']
    },
    images: [{
        url: String,
        alt: String
    }],
    specifications: {
        type: Map,
        of: String
    },
    condition: {
        type: String,
        enum: ['new', 'refurbished', 'used'],
        default: 'refurbished'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    statistics: {
        views: { type: Number, default: 0 },
        orders: { type: Number, default: 0 },
        totalSold: { type: Number, default: 0 }
    },
    tags: [String]
}, {
    timestamps: true
});

// Indexes for search and filtering
productSchema.index({ vendor: 1 });
productSchema.index({ category: 1 });
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ price: 1 });
productSchema.index({ isActive: 1 });

// Virtual for icon (can be customized based on category)
productSchema.virtual('icon').get(function() {
    const icons = {
        'SD Cards': '💾',
        'Microcontrollers': '🔌',
        'Sensors': '🌡️',
        'Display Modules': '📺',
        'Circuit Boards': '🖥️',
        'Power Supplies': '🔋',
        'Other Electronics': '⚡'
    };
    return icons[this.category] || '📦';
});

// Ensure virtuals are included in JSON
productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Product', productSchema);
