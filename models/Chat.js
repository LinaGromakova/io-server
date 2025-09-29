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

    const result = await db.query(
      `WITH existing_chat AS (
       SELECT c.id as chat_id
       FROM chats c
       JOIN chat_participants cp1 ON c.id = cp1.chat_id AND cp1.user_id = $1
       JOIN chat_participants cp2 ON c.id = cp2.chat_id AND cp2.user_id = $2
     ),
     new_chat AS (
       INSERT INTO chats (id)
       SELECT $3
       WHERE NOT EXISTS (SELECT 1 FROM existing_chat)
       RETURNING id
     ),
     insert_participants AS (
       INSERT INTO chat_participants (chat_id, user_id)
       SELECT COALESCE(ec.chat_id, nc.id), unnest(ARRAY[$1, $2])
       FROM existing_chat ec FULL OUTER JOIN new_chat nc ON true
       WHERE NOT EXISTS (SELECT 1 FROM existing_chat)
     ),
     user1_data AS (
       SELECT id, name, image, online FROM users WHERE id = $2
     ),
     user2_data AS (
       SELECT id, name, image, online FROM users WHERE id = $1
     )
     SELECT 
       COALESCE(ec.chat_id, nc.id) as chat_id,
       (SELECT name FROM user1_data) as user1_name,
       (SELECT image FROM user1_data) as user1_image,
       (SELECT online FROM user1_data) as user1_online,
       (SELECT name FROM user2_data) as user2_name,
       (SELECT image FROM user2_data) as user2_image,
       (SELECT online FROM user2_data) as user2_online
     FROM existing_chat ec 
     FULL OUTER JOIN new_chat nc ON true`,
      [user1_id, user2_id, chat_id]
    );

    const row = result.rows[0];

    return {
      forUser1: {
        chat_id: row.chat_id,
        user_id: user2_id,
        name: row.user1_name,
        image: row.user1_image,
        online: row.user1_online,
        lastMessage: null,
        lastCreate: null,
        unreadCount: '0',
        read: null,
      },
      forUser2: {
        chat_id: row.chat_id,
        user_id: user1_id,
        name: row.user2_name,
        image: row.user2_image,
        online: row.user2_online,
        lastMessage: null,
        lastCreate: null,
        unreadCount: '0',
        read: null,
      },
    };
  }

  static async deleteUserChat(chat_id) {
    const result = await db.query(
      'DELETE FROM chats WHERE id = $1 RETURNING *',
      [chat_id]
    );
    return result.rows;
  }
  static async getAllPartChats(chat_id) {
    const result = await db.query(
      `SELECT user_id 
FROM chat_participants 
WHERE chat_id = $1;`,
      [chat_id]
    );
    return result.rows.map((user) => user.user_id);
  }

  static async getChatInterlocutor(chat_id, user_id) {
    const query = `
        SELECT 
          u.id,
          u.name, 
          u.login,
          u.image,
          u.online,
          u.last_seen
        FROM users u
        JOIN chat_participants cp ON u.id = cp.user_id
        WHERE cp.chat_id = $1 AND cp.user_id != $2
      `;

    const result = await db.query(query, [chat_id, user_id]);
    return result.rows[0];
  }
  static async getUserChats(user_id) {
    const result = await db.query(
      `SELECT 
         c.id as chat_id,
         u.id as user_id,
         u.name,
         u.image,
         u.online,
         m.is_read as last_message_is_read,
         m.content as last_message,
         m.created_at as last_message_at,
         (SELECT COUNT(*) FROM messages WHERE chat_id = c.id AND is_read = FALSE AND sender_id != $1) as unread_count
       FROM chats c
       JOIN chat_participants cp ON c.id = cp.chat_id
       JOIN users u ON u.id = cp.user_id
       LEFT JOIN LATERAL (
         SELECT content, created_at, is_read FROM messages 
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
