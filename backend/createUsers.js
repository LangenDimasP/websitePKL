const dbPool = require('./db');
const bcrypt = require('bcrypt');

async function createUsers() {
  const users = [
    {
      username: 'pyo',
      full_name: 'Barvio Nadhif Aikonara',
      email: 'barvio@gmail.com',
      role: 'guest',
      password: 'password'
    },
    {
      username: 'fais',
      full_name: 'Rizki Fais Ramadhan',
      email: 'fais@gmail.com',
      role: 'guest',
      password: 'password'
    }
  ];

  for (const user of users) {
    const hash = await bcrypt.hash(user.password, 10);
    await dbPool.query(
      `INSERT INTO users (username, full_name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)`,
      [user.username, user.full_name, user.email, hash, user.role]
    );
    console.log(`User ${user.username} created!`);
  }
  process.exit();
}

createUsers().catch(console.error);