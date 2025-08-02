const express = require('express');
const multer = require('multer');
const path = require('path');
const dbPool = require('../db');
const { protect, optionalAuth } = require('../middleware/authMiddleware');
const { nanoid } = require('nanoid');
const router = express.Router();

// --- Konfigurasi Multer ---
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
        cb(null, true);
    } else {
        cb(new Error('Tipe file tidak didukung! Hanya gambar dan video yang diizinkan.'), false);
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
const upload = multer({ storage: storage, fileFilter: fileFilter });

// --- ENDPOINTS ---

// 1. MEMBUAT POSTINGAN BARU
router.post('/', protect, upload.array('files', 10), async (req, res) => {
    // Ambil songId DAN songStartTime dari body
    const { caption, aspectRatio, type = 'pribadi', songId, songStartTime = 0, songEndTime = 0 } = req.body;
    const slug = nanoid(16)
    const actorId = req.user.id; 

    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: 'File wajib di-upload' });
    }

    const connection = await dbPool.getConnection();
    try {
        await connection.beginTransaction();

        const [postResult] = await connection.query(
            'INSERT INTO posts (user_id, caption, slug, type, aspect_ratio, song_id, song_start_time, song_end_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [actorId, caption, slug, type, aspectRatio, songId || null, songStartTime, songEndTime]
        );
        const postId = postResult.insertId;

        for (let i = 0; i < req.files.length; i++) {
            const file = req.files[i];
            const fileUrl = `/Uploads/${file.filename}`;
            const mediaType = file.mimetype.startsWith('image/') ? 'image' : 'video';
            await connection.query(
                'INSERT INTO post_media (post_id, media_url, media_type, display_order) VALUES (?, ?, ?, ?)',
                [postId, fileUrl, mediaType, i]
            );
        }

        const mentionRegex = /@(\w+)/g;
        const mentionedUsernames = caption.match(mentionRegex)?.map(u => u.substring(1)) || [];
        
        if (mentionedUsernames.length > 0) {
            const [mentionedUsers] = await connection.query('SELECT id FROM users WHERE username IN (?)', [mentionedUsernames]);
            for (const mentionedUser of mentionedUsers) {
                await connection.query('INSERT INTO mentions (post_id, mentioned_user_id, actor_id) VALUES (?, ?, ?)', [postId, mentionedUser.id, actorId]);
                if (mentionedUser.id !== actorId) {
                    await connection.query('INSERT INTO notifications (user_id, actor_id, type, target_id) VALUES (?, ?, ?, ?)', [mentionedUser.id, actorId, 'mention', postId]);
                }
            }
        }
        
        await connection.commit();
        res.status(201).json({ message: 'Postingan berhasil dibuat!', postId });

    } catch (error) {
        await connection.rollback();
        console.error('Error creating post:', error);
        res.status(500).json({ message: 'Server error saat membuat post' });
    } finally {
        connection.release();
    }
});

router.get('/by-slug/:slug', optionalAuth, async (req, res) => {
    const { slug } = req.params;
    const loggedInUserId = req.user ? req.user.id : null;

    try {
        const queryParams = loggedInUserId ? [loggedInUserId, slug] : [slug];
        const isLikedQueryPart = loggedInUserId ? `(SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = ?) > 0` : 'false';

        const [posts] = await dbPool.query(`
            SELECT 
                p.id, p.slug, p.caption, p.type, p.aspect_ratio, p.created_at,
                p.song_start_time AS songStartTime, p.song_end_time AS songEndTime,
                u.username AS authorUsername, 
                u.profile_picture_url AS authorAvatar, 
                u.is_verified AS authorIsVerified,
                s.title AS songTitle, s.artist AS songArtist, s.file_url AS songUrl,
                (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS likeCount,
                (SELECT u2.username FROM likes l JOIN users u2 ON l.user_id = u2.id WHERE l.post_id = p.id ORDER BY l.created_at DESC LIMIT 1) AS firstLikerUsername,
                ${isLikedQueryPart} AS isLiked
            FROM posts p
            JOIN users u ON p.user_id = u.id
            LEFT JOIN songs s ON p.song_id = s.id
            WHERE p.slug = ?
        `, queryParams);

        if (posts.length === 0) {
            return res.status(404).json({ message: 'Post not found' });
        }

        const post = posts[0];
        const [media] = await dbPool.query("SELECT media_url AS url, media_type AS type FROM post_media WHERE post_id = ? ORDER BY display_order ASC", [post.id]);
        post.media = media;
        post.isLiked = !!post.isLiked;
        console.log('Post sent to frontend:', post);

        res.json(post);
    } catch (error) {
        console.error('Error fetching post by slug:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Fungsi helper untuk menambahkan data media dan status like ke postingan
const addExtraPostData = async (posts, loggedInUserId) => {
    for (const post of posts) {
        const [media] = await dbPool.query("SELECT media_url AS url, media_type AS type FROM post_media WHERE post_id = ? ORDER BY display_order ASC", [post.id]);
        post.media = media;
        
        if (loggedInUserId) {
            const [likeStatus] = await dbPool.query(`SELECT COUNT(*) as count FROM likes WHERE post_id = ? AND user_id = ?`, [post.id, loggedInUserId]);
            post.isLiked = likeStatus[0].count > 0;
        } else {
            post.isLiked = false;
        }
    }
    return posts;
};

// 2. MENGAMBIL POSTINGAN BERSAMA
router.get('/shared', optionalAuth, async (req, res) => {
    const loggedInUserId = req.user ? req.user.id : null;
    try {
        const queryParams = loggedInUserId ? [loggedInUserId] : [];
        const isLikedQueryPart = loggedInUserId ? `(SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = ?) > 0` : 'false';

        let [posts] = await dbPool.query(`
            SELECT 
                p.id,p.slug,p.caption, p.type, p.aspect_ratio, p.created_at, p.song_start_time, p.song_end_time,
                u.username AS authorUsername, 
                u.profile_picture_url AS authorAvatar, 
                u.is_verified AS authorIsVerified,
                s.title AS songTitle, s.artist AS songArtist, s.file_url AS songUrl,
                (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS likeCount,
                (SELECT u2.username FROM likes l JOIN users u2 ON l.user_id = u2.id WHERE l.post_id = p.id ORDER BY l.created_at DESC LIMIT 1) AS firstLikerUsername,
                ${isLikedQueryPart} AS isLiked
            FROM posts p
            JOIN users u ON p.user_id = u.id
            LEFT JOIN songs s ON p.song_id = s.id
            WHERE p.type = 'bersama'
            ORDER BY p.created_at DESC
        `, queryParams);
        posts = await addExtraPostData(posts, loggedInUserId);
        res.json(posts);
    } catch (error) {
        console.error('Error fetching shared posts:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// 3. MENGAMBIL POSTINGAN MILIK USER
router.get('/by/:username', optionalAuth, async (req, res) => {
    const { username } = req.params;
    const loggedInUserId = req.user ? req.user.id : null;
    try {
        const [users] = await dbPool.query('SELECT id FROM users WHERE username = ?', [username]);
        if (users.length === 0) return res.status(404).json({ message: 'Pengguna tidak ditemukan' });
        
        const queryParams = loggedInUserId ? [loggedInUserId, username] : [username];
        const isLikedQueryPart = loggedInUserId ? `(SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = ?) > 0` : 'false';

        let [posts] = await dbPool.query(`
            SELECT 
                p.id, p.slug, p.caption, p.type, p.aspect_ratio, p.created_at, p.song_start_time, p.song_end_time,
                u.username AS authorUsername, 
                u.profile_picture_url AS authorAvatar, 
                u.is_verified AS authorIsVerified,
                s.title AS songTitle, s.artist AS songArtist, s.file_url AS songUrl,
                (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS likeCount,
                (SELECT u2.username FROM likes l JOIN users u2 ON l.user_id = u2.id WHERE l.post_id = p.id ORDER BY l.created_at DESC LIMIT 1) AS firstLikerUsername,
                ${isLikedQueryPart} AS isLiked
            FROM posts p
            JOIN users u ON p.user_id = u.id
            LEFT JOIN songs s ON p.song_id = s.id
            WHERE u.username = ?
            ORDER BY p.created_at DESC
        `, queryParams);
        
        posts = await addExtraPostData(posts, loggedInUserId);
        res.json(posts);
    } catch (error) {
        console.error('Error fetching user posts:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// 4. LIKE ATAU UNLIKE POSTINGAN
router.post('/:id/like', protect, async (req, res) => {
    const postId = req.params.id;
    const userId = req.user.id;

    try {
        const [existingLike] = await dbPool.query('SELECT * FROM likes WHERE post_id = ? AND user_id = ?', [postId, userId]);

        if (existingLike.length > 0) {
            await dbPool.query('DELETE FROM likes WHERE post_id = ? AND user_id = ?', [postId, userId]);
        } else {
            await dbPool.query('INSERT INTO likes (post_id, user_id) VALUES (?, ?)', [postId, userId]);
            const [posts] = await dbPool.query('SELECT user_id FROM posts WHERE id = ?', [postId]);
            const postOwnerId = posts[0].user_id;
            if (postOwnerId !== userId) {
                await dbPool.query(
                    'INSERT INTO notifications (user_id, actor_id, type, target_id) VALUES (?, ?, ?, ?)',
                    [postOwnerId, userId, 'like', postId]
                );
            }
        }
        
        const [likesCountResult] = await dbPool.query('SELECT COUNT(*) as count FROM likes WHERE post_id = ?', [postId]);
        const newLikeCount = likesCountResult[0].count;
        res.json({ liked: existingLike.length === 0, newLikeCount: newLikeCount });

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Aksi sudah dilakukan.' });
        }
        console.error('Error toggling like:', error);
        res.status(500).json({ message: 'Server error saat like/unlike' });
    }
});

// 5. MENGAMBIL SEMUA KOMENTAR DARI POST
router.get('/:id/comments', async (req, res) => {
    const postId = req.params.id;
    try {
        const [comments] = await dbPool.query(`
            SELECT c.id, c.content, c.created_at, c.parent_comment_id, u.username, u.profile_picture_url, u.is_verified 
            FROM comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.post_id = ?
            ORDER BY c.created_at ASC
        `, [postId]);

        const commentMap = {};
        const nestedComments = [];

        comments.forEach(comment => {
            comment.replies = [];
            commentMap[comment.id] = comment;
        });

        comments.forEach(comment => {
            if (comment.parent_comment_id !== null) {
                const parent = commentMap[comment.parent_comment_id];
                if (parent) {
                    parent.replies.push(comment);
                }
            } else {
                nestedComments.push(comment);
            }
        });

        res.json(nestedComments);
    } catch (error) {
        console.error('Error fetching comments:', error);
        res.status(500).json({ message: 'Server error saat mengambil komentar' });
    }
});

// 6. MENAMBAHKAN KOMENTAR BARU
router.post('/:id/comments', protect, async (req, res) => {
    const postId = req.params.id;
    const userId = req.user.id;
    const { content, parentCommentId } = req.body;

    if (!content || content.trim() === '') {
        return res.status(400).json({ message: 'Komentar tidak boleh kosong' });
    }

    try {
        const [result] = await dbPool.query('INSERT INTO comments (post_id, user_id, content, parent_comment_id) VALUES (?, ?, ?, ?)', [postId, userId, content, parentCommentId || null]);
        const newCommentId = result.insertId;

        const [posts] = await dbPool.query('SELECT user_id FROM posts WHERE id = ?', [postId]);
        const postOwnerId = posts[0].user_id;

        if (postOwnerId !== userId) {
            await dbPool.query('INSERT INTO notifications (user_id, actor_id, type, target_id) VALUES (?, ?, ?, ?)', [postOwnerId, userId, 'comment', postId]);
        }
        
        if (parentCommentId) {
            const [parentComment] = await dbPool.query('SELECT user_id FROM comments WHERE id = ?', [parentCommentId]);
            const parentCommentOwnerId = parentComment[0].user_id;
            if (parentCommentOwnerId !== userId && parentCommentOwnerId !== postOwnerId) {
                await dbPool.query('INSERT INTO notifications (user_id, actor_id, type, target_id) VALUES (?, ?, ?, ?)', [parentCommentOwnerId, userId, 'comment', postId]);
            }
        }

        const [newComment] = await dbPool.query(`
            SELECT c.id, c.content, c.created_at, c.parent_comment_id, u.username, u.profile_picture_url, u.is_verified 
            FROM comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.id = ?
        `, [newCommentId]);

        res.status(201).json(newComment[0]);
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({ message: 'Server error saat menambah komentar' });
    }
});

// 7. MENGAMBIL POSTINGAN YANG DI-TAG
router.get('/tagged/:username', optionalAuth, async (req, res) => {
    const { username } = req.params;
    const loggedInUserId = req.user ? req.user.id : null;

    try {
        const [users] = await dbPool.query('SELECT id FROM users WHERE username = ?', [username]);
        if (users.length === 0) return res.status(404).json({ message: 'Pengguna tidak ditemukan' });
        const mentionedUserId = users[0].id;

        const queryParams = loggedInUserId ? [loggedInUserId, mentionedUserId] : [mentionedUserId];
        const isLikedQueryPart = loggedInUserId ? `(SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = ?) > 0` : 'false';

        const [posts] = await dbPool.query(`
            SELECT 
                p.id, p.slug, p.caption, p.type, p.aspect_ratio, p.created_at, p.song_start_time, p.song_end_time,
                u.username AS authorUsername, 
                u.profile_picture_url AS authorAvatar, 
                u.is_verified AS authorIsVerified,
                s.title AS songTitle, s.artist AS songArtist, s.file_url AS songUrl,
                (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS likeCount,
                (SELECT u2.username FROM likes l JOIN users u2 ON l.user_id = u2.id WHERE l.post_id = p.id ORDER BY l.created_at DESC LIMIT 1) AS firstLikerUsername,
                ${isLikedQueryPart} AS isLiked
            FROM posts p
            JOIN mentions m ON p.id = m.post_id
            JOIN users u ON p.user_id = u.id
            LEFT JOIN songs s ON p.song_id = s.id
            WHERE m.mentioned_user_id = ?
            ORDER BY p.created_at DESC
        `, queryParams);
        
        for (const post of posts) {
            const [media] = await dbPool.query("SELECT media_url AS url, media_type AS type FROM post_media WHERE post_id = ? ORDER BY display_order ASC", [post.id]);
            post.media = media;
            post.isLiked = !!post.isLiked;
        }

        res.json(posts);
    } catch (error) {
        console.error('Error fetching tagged posts:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// 8. MENGAMBIL POSTINGAN TUNGGAL
router.get('/:id', optionalAuth, async (req, res) => {
    const postId = req.params.id;
    const loggedInUserId = req.user ? req.user.id : null;

    try {
        const queryParams = loggedInUserId ? [loggedInUserId, postId] : [postId];
        const isLikedQueryPart = loggedInUserId ? `(SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = ?) > 0` : 'false';

        const [posts] = await dbPool.query(`
            SELECT 
            p.id, p.slug, p.caption, p.type, p.aspect_ratio, p.created_at,
            p.song_start_time AS songStartTime, p.song_end_time AS songEndTime,
            u.username AS authorUsername, 
            u.profile_picture_url AS authorAvatar, 
            u.is_verified AS authorIsVerified,
            s.title AS songTitle, s.artist AS songArtist, s.file_url AS songUrl,
            (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS likeCount,
            (SELECT u2.username FROM likes l JOIN users u2 ON l.user_id = u2.id WHERE l.post_id = p.id ORDER BY l.created_at DESC LIMIT 1) AS firstLikerUsername,
            ${isLikedQueryPart} AS isLiked
        FROM posts p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN songs s ON p.song_id = s.id
        WHERE p.id = ?
        `, queryParams);

        if (posts.length === 0) {
            return res.status(404).json({ message: 'Postingan tidak ditemukan' });
        }

        const post = posts[0];
        const [media] = await dbPool.query("SELECT media_url AS url, media_type AS type FROM post_media WHERE post_id = ? ORDER BY display_order ASC", [post.id]);
        post.media = media;
        post.isLiked = !!post.isLiked;
        
        res.json(post);
    } catch (error) {
        console.error('Error fetching single post:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// 9. MENGHAPUS POSTINGAN
router.delete('/:id', protect, async (req, res) => {
    const postId = req.params.id;
    const userId = req.user.id;

    const connection = await dbPool.getConnection();
    try {
        await connection.beginTransaction();

        const [posts] = await connection.query('SELECT user_id FROM posts WHERE id = ?', [postId]);
        if (posts.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Postingan tidak ditemukan.' });
        }
        if (posts[0].user_id !== userId) {
            await connection.rollback();
            return res.status(403).json({ message: 'Anda tidak berwenang menghapus postingan ini.' });
        }

        await connection.query('DELETE FROM likes WHERE post_id = ?', [postId]);
        await connection.query('DELETE FROM mentions WHERE post_id = ?', [postId]);

        // --- Perbaikan hapus komentar child ---
        const [parentComments] = await connection.query('SELECT id FROM comments WHERE post_id = ?', [postId]);
        const parentCommentIds = parentComments.map(row => row.id);
        if (parentCommentIds.length > 0) {
            await connection.query('DELETE FROM comments WHERE parent_comment_id IN (?)', [parentCommentIds]);
        }
        // --------------------------------------

        await connection.query('DELETE FROM comments WHERE post_id = ?', [postId]);
        await connection.query('DELETE FROM post_media WHERE post_id = ?', [postId]);
        await connection.query('DELETE FROM posts WHERE id = ?', [postId]);

        await connection.commit();
        res.json({ message: 'Postingan berhasil dihapus.' });

    } catch (error) {
        await connection.rollback();
        console.error('Error deleting post:', error);
        res.status(500).json({ message: 'Server error saat menghapus post.' });
    } finally {
        connection.release();
    }
});

module.exports = router;