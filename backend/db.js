// File: backend/db.js (Final Support MYSQL_URL)

const mysql = require('mysql2/promise');
require('dotenv').config(); // Tetap penting untuk membaca .env lokal
const { parse } = require('url');

let config;

if (process.env.MYSQL_URL) {
  // 🔍 Jika menggunakan MYSQL_URL, pecah URL-nya
  const dbUrl = process.env.MYSQL_URL;
  const { hostname, port, auth, pathname } = parse(dbUrl);
  const [user, password] = auth.split(':');
  const database = pathname.split('/')[1];

  config = {
    host: hostname,
    port,
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  };
} else {
  // 📦 Jika tidak pakai MYSQL_URL, fallback ke variabel pecahan
  config = {
    host: process.env.MYSQLHOST || process.env.DB_HOST,
    port: process.env.MYSQLPORT || process.env.DB_PORT,
    user: process.env.MYSQLUSER || process.env.DB_USER,
    password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD,
    database: process.env.MYSQLDATABASE || process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  };
}

const dbPool = mysql.createPool(config);

module.exports = dbPool;
