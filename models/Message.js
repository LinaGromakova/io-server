const db = require('../db').default;

class Message {
  static async create({ chat_id, sender_id, content }) {
    const result = await db.query(
      `INSERT INTO messages (chat_id, sender_id, content) 
       VALUES ($1, $2, $3) RETURNING *`,
      [chat_id, sender_id, content]
    );
    return result.rows[0];
  }

  static async getChatMessages(chat_id) {
    const result = await db.query(
      `SELECT m.*, u.name as sender_name, u.image as sender_image
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.chat_id = $1
       ORDER BY m.created_at ASC`,
      [chat_id]
    );
    return result.rows;
  }

  static async markAsRead(chat_id, user_id) {
    const result = await db.query(
      `UPDATE messages SET is_read = TRUE 
       WHERE chat_id = $1 AND sender_id != $2 AND is_read = FALSE
       RETURNING *`,
      [chat_id, user_id]
    );
    return result.rows;
  }
}
