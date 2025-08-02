// File: backend/routes/noteRoutes.js
const express = require('express');
const router = express.Router();
const dbPool = require('../db');
const { protect } = require('../middleware/authMiddleware');

// POST /api/notes/ (Membuat catatan baru)
router.post('/', protect, async (req, res) => {
    const { content } = req.body;
    if (!content || content.trim() === '') {
        return res.status(400).json({ message: 'Isi catatan tidak boleh kosong' });
    }
    try {
        await dbPool.query(
            'INSERT INTO notes (user_id, content) VALUES (?, ?)',
            [req.user.id, content]
        );
        res.status(201).json({ message: 'Catatan berhasil dibuat!' });
    } catch (error) {
        console.error('Error creating note:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/notes/by/:username (Mengambil semua catatan milik user)
router.get('/by/:username', async (req, res) => {
    const { username } = req.params;
    try {
        const [notes] = await dbPool.query(`
            SELECT n.id, n.content, n.created_at 
            FROM notes n
            JOIN users u ON n.user_id = u.id
            WHERE u.username = ?
            ORDER BY n.created_at DESC
        `, [username]);
        res.json(notes);
    } catch (error) {
        console.error('Error fetching notes:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.delete('/:id', protect, async (req, res) => {
    const noteId = req.params.id;
    try {
        // Pastikan hanya pemilik catatan yang bisa menghapus
        const [result] = await dbPool.query(
            'DELETE FROM notes WHERE id = ? AND user_id = ?',
            [noteId, req.user.id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Catatan tidak ditemukan atau bukan milik Anda' });
        }
        res.json({ message: 'Catatan berhasil dihapus' });
    } catch (error) {
        console.error('Error deleting note:', error);
        res.status(500).json({ message: 'Server error' });
    }
});



module.exports = router;