const { nanoid } = require('nanoid');
const db = require('./db').default;

class User {
  static async create({ name, login, password_hash, image = null }) {
    const result = await db.query(
      `INSERT INTO users (name, login, password_hash, image) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, login, password_hash, image]
    );
    return result.rows[0];
  }
  static async updateAvatar(user_id, avatar_url) {
    const result = await db.query(
      `UPDATE users 
       SET image = $1
       WHERE id = $2 
       RETURNING image`,
      [avatar_url, user_id]
    );
    return result.rows[0];
  }
  static async findByLogin(login) {
    const result = await db.query('SELECT * FROM users WHERE login = $1', [
      login,
    ]);
    return result.rows[0];
  }

  static async findById(id) {
    const result = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0];
  }

  static async searchByName(name) {
    const result = await db.query(
      'SELECT id, name, image, online FROM users WHERE name ILIKE $1',
      [`%${name}%`]
    );
    return result.rows;
  }

  static async updateOnlineStatus(id, online) {
    const result = await db.query(
      `UPDATE users SET online = $1, last_seen = CURRENT_TIMESTAMP 
       WHERE id = $2 RETURNING id, name, image, online`,
      [online, id]
    );
    return result.rows[0];
  }

  static async checkLoginExists(login) {
    const result = await db.query('SELECT * FROM users WHERE login = $1', [
      login,
    ]);
    return result.rows.length > 0;
  }

  static async createUser({ name, login, passwordHash, image = null }) {
    const id = nanoid();
    const result = await db.query(
      `INSERT INTO users (id, name, login, password_hash, image) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [id, name, login, passwordHash, image]
    );
    return result.rows[0];
  }
}
module.exports = User;
