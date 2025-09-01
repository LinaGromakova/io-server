const db = require('./db').default;
const { nanoid } = require('nanoid');

class Chat {
  static async findOrCreatePrivateChat(user1_id, user2_id) {
    const existingChat = await db.query(
      `SELECT c.id FROM chats c
       JOIN chat_participants cp1 ON c.id = cp1.chat_id
       JOIN chat_participants cp2 ON c.id = cp2.chat_id
       WHERE cp1.user_id = $1 AND cp2.user_id = $2`,
      [user1_id, user2_id]
    );

    if (existingChat.rows[0]) {
      return existingChat.rows[0];
    }

    const chat_id = nanoid();
    await db.query('INSERT INTO chats (id) VALUES ($1)', [chat_id]);
    await db.query(
      'INSERT INTO chat_participants (chat_id, user_id) VALUES ($1, $2), ($1, $3)',
      [chat_id, user1_id, user2_id]
    );

    return { id: chat_id };
  }


  static async getUserChats(user_id) {
    const result = await db.query(
      `SELECT 
         c.id as chat_id,
         u.id as user_id,
         u.name,
         u.image,
         u.online,
         m.content as last_message,
         m.created_at as last_message_at,
         (SELECT COUNT(*) FROM messages WHERE chat_id = c.id AND is_read = FALSE AND sender_id != $1) as unread_count
       FROM chats c
       JOIN chat_participants cp ON c.id = cp.chat_id
       JOIN users u ON u.id = cp.user_id
       LEFT JOIN LATERAL (
         SELECT content, created_at FROM messages 
         WHERE chat_id = c.id 
         ORDER BY created_at DESC 
         LIMIT 1
       ) m ON true
       WHERE cp.user_id != $1 AND c.id IN (
         SELECT chat_id FROM chat_participants WHERE user_id = $1
       )
       ORDER BY m.created_at DESC NULLS LAST`,
      [user_id]
    );
    return result.rows;
  }
}

module.exports = Chat;
