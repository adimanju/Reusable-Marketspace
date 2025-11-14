# Reusable Marketspace - Backend API Documentation

## 🚀 Getting Started

### Prerequisites
- Node.js v16+ and npm
- MongoDB v4.4+
- Razorpay account (for payments)
- DigiLocker API credentials (for e-KYC)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd reusable-marketspace-backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
```bash
cp .env.example .env
# Edit .env with your actual credentials
```

4. **Start MongoDB**
```bash
mongod
```

5. **Run the server**
```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

Server will run on `http://localhost:5000`

---

## 📁 Project Structure

```
reusable-marketspace-backend/
├── server.js                 # Main application entry point
├── .env                      # Environment variables (create from .env.example)
├── .env.example             # Environment variables template
├── package.json             # Dependencies and scripts
├── models/                  # Database models
│   ├── User.js             # Customer model
│   ├── Vendor.js           # Vendor model with KYC
│   ├── Product.js          # Product model
│   ├── Order.js            # Order model
│   └── Admin.js            # Admin model
├── routes/                  # API routes
│   ├── auth.js             # Authentication routes
│   ├── products.js         # Product management
│   ├── vendors.js          # Vendor operations
│   ├── admin.js            # Admin operations
│   ├── cart.js             # Shopping cart
│   ├── orders.js           # Order management
│   ├── payment.js          # Razorpay integration
│   └── kyc.js              # DigiLocker KYC
├── middleware/              # Custom middleware
│   ├── auth.js             # Authentication & authorization
│   ├── validation.js       # Input validation
│   └── errorHandler.js     # Error handling
├── utils/                   # Utility functions
│   ├── sendSMS.js          # OTP sending
│   ├── sendEmail.js        # Email notifications
│   └── logger.js           # Logging utility
└── scripts/                 # Database scripts
    └── seedDatabase.js     # Sample data seeder
```

---

## 🔐 API Endpoints

### Base URL: `http://localhost:5000/api`

---

### Authentication Endpoints

#### 1. Customer Login (Phone-based)
```http
POST /api/auth/customer/login
Content-Type: application/json

{
  "phone": "9876543210",
  "name": "John Doe" // Optional for new users
}

Response:
{
  "success": true,
  "message": "OTP sent successfully",
  "data": {
    "otpSent": true,
    "expiresIn": 300
  }
}
```

#### 2. Verify OTP
```http
POST /api/auth/customer/verify-otp
Content-Type: application/json

{
  "phone": "9876543210",
  "otp": "123456"
}

Response:
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "name": "John Doe",
    "phone": "9876543210",
    "role": "customer"
  }
}
```

#### 3. Vendor Registration
```http
POST /api/auth/vendor/register
Content-Type: application/json

{
  "businessName": "TechRecycle Co.",
  "email": "vendor@example.com",
  "password": "SecurePass123!",
  "contactNumber": "9876543210",
  "businessAddress": {
    "street": "123 Main St",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001"
  }
}

Response:
{
  "success": true,
  "message": "Vendor registered successfully. Please complete KYC verification.",
  "data": {
    "vendorId": "...",
    "kycStatus": "pending"
  }
}
```

#### 4. Vendor Login
```http
POST /api/auth/vendor/login
Content-Type: application/json

{
  "email": "vendor@example.com",
  "password": "SecurePass123!"
}

Response:
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "vendor": {
    "id": "...",
    "businessName": "TechRecycle Co.",
    "email": "vendor@example.com",
    "kycStatus": "pending"
  }
}
```

#### 5. Admin Login
```http
POST /api/auth/admin/login
Content-Type: application/json

{
  "username": "admin",
  "password": "Admin@123456"
}

Response:
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "admin": {
    "id": "...",
    "username": "admin",
    "role": "admin"
  }
}
```

---

### KYC Endpoints (DigiLocker Integration)

#### 1. Initiate KYC Process
```http
POST /api/kyc/initiate
Authorization: Bearer <vendor_token>
Content-Type: application/json

{
  "businessName": "TechRecycle Co.",
  "contactNumber": "9876543210",
  "businessAddress": {
    "street": "123 Main St",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001"
  },
  "gstin": "27AABCU9603R1ZM",
  "aadhaarNumber": "123456789012"
}

Response:
{
  "success": true,
  "message": "KYC initiation successful",
  "data": {
    "authUrl": "https://api.digitallocker.gov.in/public/oauth2/1/authorize?...",
    "state": "...",
    "kycStatus": "in_progress"
  }
}
```

#### 2. Get KYC Status
```http
GET /api/kyc/status
Authorization: Bearer <vendor_token>

Response:
{
  "success": true,
  "data": {
    "kycStatus": "verified",
    "aadhaarVerified": true,
    "verifiedAt": "2025-11-07T08:30:00.000Z",
    "isApprovedByAdmin": true
  }
}
```

---

### Product Endpoints

#### 1. Get All Products (Public)
```http
GET /api/products?category=SD%20Cards&page=1&limit=10

Response:
{
  "success": true,
  "count": 6,
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalPages": 1
  },
  "data": [
    {
      "id": "...",
      "name": "32GB SD Card Bulk Pack",
      "category": "SD Cards",
      "price": 350,
      "quantity": 5000,
      "minOrderQuantity": 50,
      "vendor": {
        "id": "...",
        "businessName": "TechRecycle Co."
      },
      "icon": "💾"
    }
  ]
}
```

#### 2. Add Product (Vendor)
```http
POST /api/products
Authorization: Bearer <vendor_token>
Content-Type: application/json

{
  "name": "64GB SD Card Bulk",
  "category": "SD Cards",
  "description": "High-quality refurbished SD cards",
  "price": 500,
  "quantity": 3000,
  "minOrderQuantity": 50,
  "condition": "refurbished"
}

Response:
{
  "success": true,
  "message": "Product added successfully",
  "data": {
    "id": "...",
    "name": "64GB SD Card Bulk",
    "status": "pending_approval"
  }
}
```

---

### Payment Endpoints (Razorpay)

#### 1. Create Order
```http
POST /api/payment/create-order
Authorization: Bearer <customer_token>
Content-Type: application/json

{
  "items": [
    {
      "productId": "...",
      "quantity": 100
    }
  ],
  "shippingAddress": {
    "name": "John Doe",
    "phone": "9876543210",
    "street": "456 Delivery St",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400002"
  },
  "paymentMethod": "upi"
}

Response:
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "orderId": "...",
    "orderNumber": "ORD-ABC123",
    "razorpayOrder": {
      "id": "order_xyz123",
      "amount": 41300,
      "currency": "INR",
      "key": "rzp_test_..."
    },
    "pricing": {
      "subtotal": 35000,
      "gst": 6300,
      "total": 41300
    }
  }
}
```

#### 2. Verify Payment
```http
POST /api/payment/verify
Authorization: Bearer <customer_token>
Content-Type: application/json

{
  "razorpay_order_id": "order_xyz123",
  "razorpay_payment_id": "pay_abc456",
  "razorpay_signature": "...",
  "orderId": "..."
}

Response:
{
  "success": true,
  "message": "Payment verified successfully",
  "data": {
    "orderNumber": "ORD-ABC123",
    "status": "confirmed",
    "paidAmount": 41300
  }
}
```

---

### Admin Endpoints

#### 1. Get All Vendors (Pending Approval)
```http
GET /api/admin/vendors?status=pending
Authorization: Bearer <admin_token>

Response:
{
  "success": true,
  "count": 5,
  "data": [
    {
      "id": "...",
      "businessName": "CircuitHub",
      "email": "vendor@example.com",
      "kycStatus": "verified",
      "isApprovedByAdmin": false
    }
  ]
}
```

#### 2. Approve Vendor
```http
POST /api/admin/vendors/:vendorId/approve
Authorization: Bearer <admin_token>

Response:
{
  "success": true,
  "message": "Vendor approved successfully"
}
```

#### 3. Get All Products
```http
GET /api/admin/products
Authorization: Bearer <admin_token>

Response:
{
  "success": true,
  "count": 50,
  "data": [...]
}
```

---

## 🔧 Environment Variables

See `.env.example` for all required environment variables:

- **Server**: `PORT`, `NODE_ENV`, `CLIENT_URL`
- **Database**: `MONGODB_URI`
- **JWT**: `JWT_SECRET`, `JWT_EXPIRE`
- **DigiLocker**: `DIGILOCKER_CLIENT_ID`, `DIGILOCKER_CLIENT_SECRET`
- **Razorpay**: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`
- **SMS**: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`
- **Email**: `EMAIL_SERVICE`, `EMAIL_USER`, `EMAIL_PASSWORD`

---

## 🔒 Security Features

1. **JWT Authentication** - Secure token-based auth
2. **Password Hashing** - bcrypt with 12 salt rounds
3. **Rate Limiting** - 100 requests per 15 minutes
4. **Helmet.js** - Security headers
5. **CORS** - Configured cross-origin requests
6. **Input Validation** - express-validator
7. **MongoDB Sanitization** - Prevent injection attacks

---

## 📞 Support

For issues or questions:
- Email: support@reusablemarketspace.com
- GitHub Issues: <repository-url>/issues

---

## 📄 License

MIT License - see LICENSE file for details
"# Reusable-Marketspace" 
