// File: backend/routes/notificationRoutes.js
const express = require('express');
const router = express.Router();
const dbPool = require('../db');
const { protect } = require('../middleware/authMiddleware');

// GET /api/notifications/ (Mengambil semua notifikasi user)
router.get('/', protect, async (req, res) => {
    try {
        const [notifications] = await dbPool.query(`
            SELECT 
                n.id, n.type, n.target_id, n.is_read, n.created_at, 
                u.username AS actor_username, u.profile_picture_url AS actor_avatar,
                p.id AS post_id,
                p.slug AS post_slug,
                pm.media_url AS post_image_url
            FROM notifications n
            JOIN users u ON n.actor_id = u.id
            LEFT JOIN posts p ON n.target_id = p.id
            LEFT JOIN post_media pm ON pm.post_id = p.id AND pm.display_order = 0
            WHERE n.user_id = ?
            ORDER BY n.created_at DESC
        `, [req.user.id]);
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// GET /api/notifications/unread-count (Hanya menghitung notif baru)
router.get('/unread-count', protect, async (req, res) => {
    try {
        const [result] = await dbPool.query(
            'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
            [req.user.id]
        );
        res.json({ count: result[0].count });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// POST /api/notifications/mark-read (Menandai semua notif sebagai terbaca)
router.post('/mark-read', protect, async (req, res) => {
    try {
        await dbPool.query(
            'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0',
            [req.user.id]
        );
        res.json({ message: 'Notifications marked as read' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;