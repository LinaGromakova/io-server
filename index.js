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
  socket.on('join_chat', async ({ chat_id, user_id }) => {
    try {
      if (!chat_id) {
        return console.log('error');
      }
      console.log(user_id);
      const isParticipant = await Message.checkChatParticipation(
        user_id,
        chat_id
      );
      if (!isParticipant) {
        console.log('not part');
        return;
      }
      socket.join(chat_id);
      console.log('join success', chat_id);
    } catch (error) {
      console.log(error);
      return;
    }
  });

  socket.on('connect_app', async (data) => {
    socket.join('online-users');
    const { user_id, online } = data;
    socket.data.user_id = user_id;

    await User.updateOnlineStatus(user_id, online);
    io.to('online-users').emit('update-online', {
      user_id: user_id,
      online: online,
    });
  });

  socket.on('send_message', async (data) => {
    try {
      const canSend = await Message.checkChatParticipation(
        data.sender_id,
        data.chat_id
      );

      if (!canSend) {
        // console.log('not part');
        return;
      }
      const savedMessage = await Message.create(data);
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
      io.to(chat_id).emit('messages_read', { idx: [updatedMessages.id] });
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
