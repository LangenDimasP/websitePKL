const express = require('express');
const router = express.Router();
const dbPool = require('../db');
const multer = require('multer');
const { protect } = require('../middleware/authMiddleware');



// Setup multer untuk upload file
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/stories/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// POST /api/stories - Upload story
router.post('/', protect, upload.single('media'), async (req, res) => {
  try {
    const { songId, songStartTime, songEndTime, videoStart, videoEnd } = req.body;
    const userId = req.user.id;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Tambahkan parsing di sini
    const parsedVideoStart = videoStart ? parseFloat(videoStart) : 0;
    const parsedVideoEnd = videoEnd ? parseFloat(videoEnd) : null;

    if (!req.file) return res.status(400).json({ message: 'Media wajib diupload.' });

    await dbPool.query(
      `INSERT INTO stories 
        (user_id, media_url, media_type, song_id, song_start_time, song_end_time, expires_at, video_start, video_end)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        '/uploads/stories/' + req.file.filename,
        req.file.mimetype.startsWith('video/') ? 'video' : 'image',
        songId || null,
        songStartTime || null,
        songEndTime || null,
        expiresAt,
        parsedVideoStart,
        parsedVideoEnd
      ]
    );
    res.json({ message: 'Story berhasil diupload.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// GET /api/stories/:username - Ambil story user
router.get('/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const [users] = await dbPool.query('SELECT id FROM users WHERE username = ?', [username]);
    if (users.length === 0) return res.status(404).json({ message: 'User tidak ditemukan.' });

    const userId = users[0].id;
    const now = new Date();
    const [stories] = await dbPool.query(
      `SELECT * FROM stories WHERE user_id = ? AND expires_at > ? ORDER BY created_at DESC`,
      [userId, now]
    );
    res.json(stories);
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// DELETE /api/stories/:id - Hapus story manual
router.delete('/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    // Pastikan hanya owner yang bisa hapus
    const [rows] = await dbPool.query('SELECT user_id FROM stories WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Story tidak ditemukan.' });
    if (rows[0].user_id !== req.user.id) return res.status(403).json({ message: 'Tidak boleh hapus story orang lain.' });

    await dbPool.query('DELETE FROM stories WHERE id = ?', [id]);
    res.json({ message: 'Story dihapus.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;