// File: backend/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const dbPool = require('../db');
const { protect, optionalAuth } = require('../middleware/authMiddleware');
const bcrypt = require('bcrypt');

// Konfigurasi Multer untuk upload foto profil
const multer = require('multer');
const path = require('path');

// Filter untuk hanya mengizinkan file gambar
const imageFileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Hanya file gambar yang diizinkan!'), false);
    }
};

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
    }
});

// Buat instance upload khusus untuk file ini
const upload = multer({ storage: storage, fileFilter: imageFileFilter });


// --- ENDPOINTS (Urutan Penting!) ---

// 1. GET /api/users/members (Mengambil data anggota PKL untuk homepage)
router.get('/members', async (req, res) => {
    try {
        const [members] = await dbPool.query(
            `SELECT username, full_name, profile_picture_url, bio 
             FROM users 
            WHERE role IN ('guest', 'admin')
             ORDER BY full_name ASC`
        );
        res.json(members);
    } catch (error) {
        console.error('Error fetching members:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// 2. GET /api/users/profile/me (Mengambil data profil PENGGUNA YANG LOGIN)
router.get('/profile/me', protect, async (req, res) => {
    try {
        const [users] = await dbPool.query(
            'SELECT id, username, full_name, email, bio, school, profile_picture_url FROM users WHERE id = ?',
            [req.user.id]
        );
        if (users.length === 0) {
            return res.status(404).json({ message: 'Pengguna tidak ditemukan' });
        }
        res.json(users[0]);
    } catch (error) {
        console.error('Error fetching own profile:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// 3. PUT /api/users/profile/update (Untuk MENYIMPAN perubahan profil)
router.put('/profile/update', protect, upload.single('profilePicture'), async (req, res) => {
    const { username, fullName, bio, school, currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    const connection = await dbPool.getConnection();
    try {
        await connection.beginTransaction();

        const fieldsToUpdate = [];
        const values = [];

        // Logika untuk update password
        if (currentPassword && newPassword) {
            const [users] = await connection.query('SELECT password_hash FROM users WHERE id = ?', [userId]);
            const user = users[0];

            const isPasswordCorrect = await bcrypt.compare(currentPassword, user.password_hash);
            if (!isPasswordCorrect) {
                await connection.rollback();
                return res.status(401).json({ message: 'Password saat ini salah.' });
            }

            const hashedNewPassword = await bcrypt.hash(newPassword, 10);
            fieldsToUpdate.push('password_hash = ?');
            values.push(hashedNewPassword);
        }

        // Logika untuk update info lain
        if (req.file) {
            const profilePictureUrl = `/uploads/${req.file.filename}`;
            fieldsToUpdate.push('profile_picture_url = ?');
            values.push(profilePictureUrl);
        }
        if (username) { fieldsToUpdate.push('username = ?'); values.push(username); }
        if (fullName) { fieldsToUpdate.push('full_name = ?'); values.push(fullName); }
        if (bio) { fieldsToUpdate.push('bio = ?'); values.push(bio); }
        if (school) { fieldsToUpdate.push('school = ?'); values.push(school); }

        if (fieldsToUpdate.length === 0) {
            await connection.rollback();
            return res.status(400).json({ message: 'Tidak ada data untuk diupdate' });
        }

        values.push(userId);
        const sql = `UPDATE users SET ${fieldsToUpdate.join(', ')} WHERE id = ?`;
        await connection.query(sql, values);

        await connection.commit();
        res.json({ message: 'Profil berhasil diperbarui!' });

    } catch (error) {
        await connection.rollback();
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Username tersebut sudah digunakan.' });
        }
        console.error('Error updating profile:', error);
        res.status(500).json({ message: 'Server error saat memperbarui profil' });
    } finally {
        connection.release();
    }
});

// 4. GET /api/users/search (Untuk mencari pengguna)
// DIUBAH: Menggunakan optionalAuth agar tamu juga bisa mencari
router.get('/search', optionalAuth, async (req, res) => {
    const { q } = req.query;
    const loggedInUserId = req.user ? req.user.id : null;

    if (!q) {
        return res.json([]);
    }

    try {
        let users;
        // Jika pengguna login, jangan tampilkan diri sendiri di hasil pencarian
        if (loggedInUserId) {
            [users] = await dbPool.query(
                `SELECT id, username, full_name, profile_picture_url, is_verified 
                 FROM users 
                 WHERE (username LIKE ? OR full_name LIKE ?) AND id != ?`,
                [`%${q}%`, `%${q}%`, loggedInUserId]
            );
        } else {
            // Jika tamu, tampilkan semua hasil yang cocok
            [users] = await dbPool.query(
                `SELECT id, username, full_name, profile_picture_url, is_verified 
                 FROM users 
                 WHERE (username LIKE ? OR full_name LIKE ?)`,
                [`%${q}%`, `%${q}%`]
            );
        }
        res.json(users);
    } catch (error) {
        console.error('Error searching users:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// 5. GET /api/users/:username (Mengambil profil lengkap PENGGUNA LAIN - HARUS PALING AKHIR)
router.get('/:username', optionalAuth, async (req, res) => {
    const { username } = req.params;
    const loggedInUserId = req.user ? req.user.id : null;

    try {
        const [users] = await dbPool.query(
            'SELECT id, username, full_name, bio, school, profile_picture_url, is_verified FROM users WHERE username = ?',
            [username]
        );
        if (users.length === 0) {
            return res.status(404).json({ message: 'Pengguna tidak ditemukan' });
        }
        const profileUser = users[0];

        const [posts] = await dbPool.query('SELECT COUNT(*) as postCount FROM posts WHERE user_id = ?', [profileUser.id]);
        const [followers] = await dbPool.query('SELECT COUNT(*) as followerCount FROM followers WHERE following_id = ?', [profileUser.id]);
        const [following] = await dbPool.query('SELECT COUNT(*) as followingCount FROM followers WHERE follower_id = ?', [profileUser.id]);
        
        let isFollowedByMe = false;
        if (loggedInUserId) {
            const [followCheck] = await dbPool.query(
                'SELECT COUNT(*) as count FROM followers WHERE follower_id = ? AND following_id = ?',
                [loggedInUserId, profileUser.id]
            );
            isFollowedByMe = followCheck[0].count > 0;
        }

        res.json({
            user: profileUser,
            stats: {
                postCount: posts[0].postCount,
                followerCount: followers[0].followerCount,
                followingCount: following[0].followingCount,
            },
            isFollowedByMe
        });

    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// 6. POST /api/users/:username/follow (Untuk toggle follow/unfollow)
router.post('/:username/follow', protect, async (req, res) => {
    const { username: usernameToFollow } = req.params;
    const followerId = req.user.id;

    try {
        const [users] = await dbPool.query('SELECT id FROM users WHERE username = ?', [usernameToFollow]);
        if (users.length === 0) {
            return res.status(404).json({ message: 'Pengguna yang akan difollow tidak ditemukan' });
        }
        const followingId = users[0].id;

        if (followerId === followingId) {
            return res.status(400).json({ message: 'Anda tidak bisa mem-follow diri sendiri' });
        }

        const [existingFollow] = await dbPool.query(
            'SELECT * FROM followers WHERE follower_id = ? AND following_id = ?',
            [followerId, followingId]
        );

        if (existingFollow.length > 0) {
            await dbPool.query(
                'DELETE FROM followers WHERE follower_id = ? AND following_id = ?',
                [followerId, followingId]
            );
            res.json({ following: false, message: 'Unfollowed' });
        } else {
            await dbPool.query(
                'INSERT INTO followers (follower_id, following_id) VALUES (?, ?)',
                [followerId, followingId]
            );
            await dbPool.query(
                'INSERT INTO notifications (user_id, actor_id, type) VALUES (?, ?, ?)',
                [followingId, followerId, 'follow']
            );
            res.json({ following: true, message: 'Followed' });
        }
    } catch (error) {
        console.error('Error toggling follow:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// BARU: GET /api/users/:username/followers (Mengambil daftar pengikut)
router.get('/:username/followers', async (req, res) => {
    try {
        const { username } = req.params;
        const [users] = await dbPool.query(
            `SELECT u.id, u.username, u.full_name, u.profile_picture_url, u.is_verified 
             FROM users u
             JOIN followers f ON u.id = f.follower_id
             WHERE f.following_id = (SELECT id FROM users WHERE username = ?)`,
            [username]
        );
        res.json(users);
    } catch (error) {
        console.error('Error fetching followers:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// BARU: GET /api/users/:username/following (Mengambil daftar yang diikuti)
router.get('/:username/following', async (req, res) => {
    try {
        const { username } = req.params;
        const [users] = await dbPool.query(
            `SELECT u.id, u.username, u.full_name, u.profile_picture_url, u.is_verified 
             FROM users u
             JOIN followers f ON u.id = f.following_id
             WHERE f.follower_id = (SELECT id FROM users WHERE username = ?)`,
            [username]
        );
        res.json(users);
    } catch (error) {
        console.error('Error fetching following list:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;
