// File: backend/routes/authRoutes.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dbPool = require('../db');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'ganti-ini-dengan-teks-rahasia-yang-sangat-panjang';

// ENDPOINT REGISTER DIHAPUS

// ENDPOINT: POST /api/auth/login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Username dan password wajib diisi' });
    }

    try {
        const [users] = await dbPool.query('SELECT * FROM users WHERE username = ?', [username]);
        if (users.length === 0) {
            return res.status(401).json({ message: 'Username atau password salah' });
        }
        const user = users[0];

        const isPasswordCorrect = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordCorrect) {
            return res.status(401).json({ message: 'Username atau password salah' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: '1d' }
        );
        
        res.json({ message: 'Login berhasil!', token });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server' });
    }
});

module.exports = router;
