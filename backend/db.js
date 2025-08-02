// File: backend/db.js (Versi Final yang Cerdas)

const mysql = require('mysql2/promise');
require('dotenv').config(); // <-- Biarkan ini agar file .env lokal terbaca

const dbPool = mysql.createPool({
    // Gunakan variabel Railway JIKA ADA, jika tidak, gunakan variabel dari .env
    host: process.env.MYSQLHOST || process.env.DB_HOST,
    user: process.env.MYSQLUSER || process.env.DB_USER,
    password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD,
    database: process.env.MYSQLDATABASE || process.env.DB_NAME,
    port: process.env.MYSQLPORT || process.env.DB_PORT,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = dbPool;