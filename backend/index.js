
const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const dbPool = require('./db');
const bcrypt = require('bcrypt');

const password = 'password';
let hash;
(async () => {
  hash = await bcrypt.hash(password, 10);
})();


// ...lanjutkan kode kamu...

const app = express();

setInterval(async () => {
  try {
    await dbPool.query('DELETE FROM stories WHERE expires_at < NOW()');
  } catch (err) {
    console.error('Gagal hapus story expired:', err);
  }
}, 60 * 60 * 1000);

// DIUBAH: Kembali ke konfigurasi CORS sederhana
app.use(cors());

app.use(express.json());

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const postRoutes = require('./routes/postRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const noteRoutes = require('./routes/noteRoutes');
const songRoutes = require('./routes/songRoutes');

// Gunakan routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/songs', songRoutes);
app.use('/api/stories', require('./routes/storyRoutes'));

// Jadikan folder 'uploads' statis
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const PORT = process.env.PORT || 3001;

app.get('/', (req, res) => {
  res.send('API PKL berjalan!');
});

// DIUBAH: Hapus '0.0.0.0' agar hanya berjalan di localhost
app.listen(PORT, '0.0.0.0', async () => {
    try {
        await dbPool.query('SELECT 1');
        console.log('✅ Database connected!');
    } catch (error) {
        console.error('❌ Could not connect to the database.', error);
    }
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
