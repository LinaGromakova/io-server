const db = require('./db').default;
const { nanoid } = require('nanoid');

class Message {
  static async create({ chat_id, sender_id, content }) {
    const id = nanoid();
    const result = await db.query(
      `INSERT INTO messages (id, chat_id, sender_id, content) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [id, chat_id, sender_id, content]
    );
    return result.rows[0];
  }
  static async checkChatParticipation(user_id, chat_id) {
    const result = await db.query(
      `SELECT 1 FROM chat_participants 
     WHERE chat_id = $1 AND user_id = $2`,
      [chat_id, user_id]
    );
    return result.rows.length > 0;
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
module.exports = Message;
