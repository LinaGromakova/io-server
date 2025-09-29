require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const app = express();
const route = require('./route');
const session = require('express-session');
const Message = require('./models/Message');
const path = require('path');
const { default: pool } = require('./models/db');
const User = require('./models/User');
const Chat = require('./models/Chat');
const PgStore = require('connect-pg-simple')(session);

app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());

app.use(
  session({
    store: new PgStore({
      pool: pool,
      tableName: 'session',
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24,
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
    },
    name: 'sid',
  })
);

app.use(
  '/uploads',
  express.static(path.join(__dirname, 'uploads'), {
    setHeaders: (res, path) => {
      if (path.endsWith('.png')) {
        res.setHeader('Content-Type', 'image/png');
      }
    },
  })
);
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.set('io', io);
app.use(route);

io.on('connection', (socket) => {
  socket.on('connect_app', async (data) => {
    const { user_id, online } = data;
    socket.join(['online-users', user_id]);
    socket.data.user_id = user_id;

    await User.updateOnlineStatus(user_id, online);
    io.to('online-users').emit('update-online', {
      user_id: user_id,
      online: online,
    });
  });
  socket.on('join_chat', async ({ chat_id, user_id }) => {
    try {
      if (!chat_id) {
        return console.log('error');
      }
      const isParticipant = await Message.checkChatParticipation(
        user_id,
        chat_id
      );
      if (!isParticipant) {
        console.log('not part');
        return;
      }
      socket.join(chat_id);
      const partArr = await Chat.getAllPartChats(chat_id);
      socket.data.partArr = partArr;
    } catch (error) {
      console.log(error);
      return;
    }
  });

  socket.on('send_message', async (data) => {
    try {
      const canSend = await Message.checkChatParticipation(
        data.sender_id,
        data.chat_id
      );
      if (!canSend) {
        return;
      }

      const savedMessage = await Message.create(data);
      const partArr = await Chat.getAllPartChats(data.chat_id);
      const user_id = partArr.find((id) => id !== data.sender_id);
      const unreadCount = await Message.getUnreadCount(data.chat_id, user_id);

      console.log(unreadCount, 'count send');
      io.to(user_id).emit('inc-unread-message', {
        count: unreadCount,
        chat_id: data.chat_id,
      });
      partArr.forEach((id) => {
        io.to(id).emit('update-last-message', savedMessage);
      });
      io.to(data.chat_id).emit('new_message', savedMessage);
    } catch (error) {
      console.log(error);
    }
  });
  socket.on('leave_chat', ({ chat_id }) => {
    socket.leave(chat_id);
  });
  socket.on('read_messages', async (chat_id, user_id) => {
    try {
      const updatedMessages = await Message.markAsRead(chat_id, user_id);
      const partArr = await Chat.getAllPartChats(chat_id);

      const unreadCount = await Message.getUnreadCount(chat_id, user_id);
      const updateChatMessage = updatedMessages[updatedMessages.length - 1];
      partArr.forEach((id) => {
        io.to(id).emit('update-read-message', updateChatMessage);
        io.to(id).emit('unread_updated', {
          count: unreadCount,
          chat_id: chat_id,
        });
      });

      io.to(chat_id).emit('messages_read', updatedMessages);
    } catch (error) {
      console.log('Error read message', error);
    }
  });
  socket.on('disconnect', async () => {
    const user_id = socket.data.user_id;
    await User.updateOnlineStatus(user_id, false);
    io.to('online-users').emit('update-online', {
      user_id: user_id,
      online: false,
    });
    console.log('disconnect');
  });
});

server.listen(5000, () => {
  console.log('Server start');
});
