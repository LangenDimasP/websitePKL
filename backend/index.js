const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const dbPool = require('./db');
// const bcrypt = require('bcrypt'); // Dihapus karena tidak digunakan di sini

// DIHAPUS: Kode bcrypt yang tidak terpakai
// const password = 'password';
// let hash;
// (async () => {
//   hash = await bcrypt.hash(password, 10);
// })();

const app = express();

// Menjalankan tugas hapus story expired setiap 1 jam
setInterval(async () => {
  try {
    await dbPool.query('DELETE FROM stories WHERE expires_at < NOW()');
  } catch (err) {
    console.error('Gagal hapus story expired:', err);
  }
}, 60 * 60 * 1000);

// Middleware
app.use(cors());
app.use(express.json());

// Import & Gunakan Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/posts', require('./routes/postRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/notes', require('./routes/noteRoutes'));
app.use('/api/songs', require('./routes/songRoutes'));
app.use('/api/stories', require('./routes/storyRoutes'));

// Menyajikan folder 'uploads' secara statis
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const PORT = process.env.PORT || 3001;

app.get('/', (req, res) => {
  res.send('API PKL berjalan!');
});

// Menjalankan server
// '0.0.0.0' sudah benar untuk hosting seperti Railway/Docker
app.listen(PORT, '0.0.0.0', async () => {
    try {
        await dbPool.query('SELECT 1');
        console.log('✅ Database connected!');
    } catch (error) {
        console.error('❌ Could not connect to the database.', error);
        // SARAN: Hentikan aplikasi jika database gagal terhubung 
    }
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});