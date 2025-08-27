const db = require('../db').default;

class Blacklist {
  static async addToBlacklist(user_id, blocked_user_id) {
    const result = await db.query(
      `INSERT INTO blacklist (user_id, blocked_user_id) 
       VALUES ($1, $2) RETURNING *`,
      [user_id, blocked_user_id]
    );
    return result.rows[0];
  }

  static async removeFromBlacklist(user_id, blocked_user_id) {
    const result = await db.query(
      'DELETE FROM blacklist WHERE user_id = $1 AND blocked_user_id = $2 RETURNING *',
      [user_id, blocked_user_id]
    );
    return result.rows[0];
  }

  static async getBlacklist(user_id) {
    const result = await db.query(
      `SELECT u.id, u.name, u.image 
       FROM blacklist b
       JOIN users u ON b.blocked_user_id = u.id
       WHERE b.user_id = $1`,
      [user_id]
    );
    return result.rows;
  }
}
