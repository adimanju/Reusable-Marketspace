const mysql = require('mysql2/promise');
require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');

async function initializeDatabase() {
    try {
        // Create connection without database
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || ''
        });

        // Create database if it doesn't exist
        await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'reusable_marketspace'}`);
        console.log('✅ Database created or already exists');

        // Use the database
        await connection.query(`USE ${process.env.DB_NAME || 'reusable_marketspace'}`);

        // Read and execute main schema
        const mainSchema = await fs.readFile(
            path.join(__dirname, 'database', 'schema.sql'),
            'utf8'
        );
        await connection.query(mainSchema);
        console.log('✅ Main schema loaded successfully');

        // Read and execute cart schema
        const cartSchema = await fs.readFile(
            path.join(__dirname, 'database', 'cart_schema.sql'),
            'utf8'
        );
        await connection.query(cartSchema);
        console.log('✅ Cart schema loaded successfully');

        await connection.end();
        console.log('✅ Database initialization completed');
        process.exit(0);
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        process.exit(1);
    }
}

initializeDatabase();