require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const app = express();
const route = require('./route');
const session = require('express-session');
const PgSession = require('connect-pg-simple')(session);
const pool = require('./models/db');
const Message = require('./models/Message');
const path = require('path');
app.use(cors({ origin: '*' }));
app.use(express.json());

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

app.use(
  session({
    store: new PgSession({ pool }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24,
    },
  })
);

app.use(route);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

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

  socket.on('send_message', async (data) => {
    try {
      const canSend = await Message.checkChatParticipation(
        data.sender_id,
        data.chat_id
      );

      if (!canSend) {
        console.log('not part');
        return;
      }
      const savedMessage = await Message.create(data);
      console.log(savedMessage);
      io.to(data.chat_id).emit('new_message', savedMessage);
    } catch (error) {
      console.log(error);
    }
  });
  socket.on('leave_chat', ({ chat_id, user_id }) => {
    socket.leave(chat_id);
    console.log(`User ${user_id} left chat ${chat_id}`);
  });
  socket.on('disconnect', () => {
    console.log('disconnect');
  });
});

server.listen(5000, () => {
  console.log('Server start');
});
