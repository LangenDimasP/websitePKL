// File: backend/routes/songRoutes.js (Buat file baru ini)
const express = require('express');
const router = express.Router();
const dbPool = require('../db');
// DIUBAH: Impor juga 'adminOnly'
const { protect, adminOnly } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');

// Konfigurasi Multer khusus untuk file audio
const audioStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/music/'), // Simpan di folder terpisah
    filename: (req, file, cb) => cb(null, `song-${Date.now()}${path.extname(file.originalname)}`)
});
const audioUpload = multer({ storage: audioStorage });


router.get('/', protect, async (req, res) => {
    try {
        const [songs] = await dbPool.query('SELECT id, title, artist, file_url FROM songs ORDER BY artist, title');
        res.json(songs);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// POST /api/songs/upload (Mengunggah lagu baru)
// DIUBAH: Tambahkan middleware 'adminOnly' setelah 'protect'
router.post('/upload', protect, adminOnly, audioUpload.single('audioFile'), async (req, res) => {
    const { title, artist } = req.body;
    if (!title || !artist || !req.file) {
        return res.status(400).json({ message: 'Judul, artis, dan file musik wajib diisi.' });
    }

    const fileUrl = `/uploads/music/${req.file.filename}`;

    try {
        await dbPool.query(
            'INSERT INTO songs (title, artist, file_url) VALUES (?, ?, ?)',
            [title, artist, fileUrl]
        );
        res.status(201).json({ message: 'Lagu berhasil ditambahkan!' });
    } catch (error) {
        console.error("Error uploading song:", error);
        res.status(500).json({ message: 'Server error saat mengunggah lagu.' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const [songs] = await dbPool.query(
            'SELECT id, title, artist, file_url as url FROM songs WHERE id = ?',
            [req.params.id]
        );

        if (songs.length === 0) {
            return res.status(404).json({ message: 'Lagu tidak ditemukan' });
        }

        res.json(songs[0]);
    } catch (error) {
        console.error('Error fetching song:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;
