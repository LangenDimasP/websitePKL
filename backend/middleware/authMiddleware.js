const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
    // Debug log untuk melihat headers yang masuk
    console.log('Authorization header:', req.headers.authorization);
    
    let token;
    
    // Cek apakah ada authorization header dengan Bearer token
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Ekstrak token dari header
            token = req.headers.authorization.split(' ')[1];
            console.log('Extracted token:', token ? 'Token exists' : 'No token');
            
            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'ganti-ini-dengan-teks-rahasia-yang-sangat-panjang');
            req.user = decoded;
            console.log('Token verified successfully for user:', decoded.id);
            
            // Lanjutkan ke middleware/route berikutnya
            return next();
        } catch (error) {
            console.error('Token verification failed:', error.message);
            return res.status(401).json({ 
                message: 'Tidak terotorisasi, token gagal',
                error: error.message 
            });
        }
    }
    
    // Jika tidak ada token sama sekali
    console.log('No authorization header found');
    return res.status(401).json({ message: 'Tidak terotorisasi, tidak ada token' });
};

const optionalAuth = (req, res, next) => {
    let token;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'ganti-ini-dengan-teks-rahasia-yang-sangat-panjang');
            req.user = decoded;
        } catch (error) {
            console.error('Optional auth token verification failed:', error.message);
            req.user = null;
        }
    } else {
        req.user = null;
    }
    
    next();
};

const adminOnly = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Akses ditolak. Hanya untuk admin.' });
    }
};

module.exports = { protect, optionalAuth, adminOnly };