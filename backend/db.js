// File: backend/db.js
const mysql = require('mysql2/promise');
// require('dotenv').config(); // Baris ini tidak lagi diperlukan di server Railway, tapi boleh dibiarkan untuk development lokal

const dbPool = mysql.createPool({
    host: process.env.MYSQLHOST,       // Diubah dari DB_HOST
    user: process.env.MYSQLUSER,       // Diubah dari DB_USER
    password: process.env.MYSQLPASSWORD, // Diubah dari DB_PASSWORD
    database: process.env.MYSQLDATABASE, // Diubah dari DB_NAME
    port: process.env.MYSQLPORT,         // Penting untuk ditambahkan
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = dbPool;