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

app.use(cors({ origin: '*' }));
app.use(express.json());

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

// const io = new Server(server, {
//     cors: {
//         origin: "*",
//         methods: ["GET","POST"]
//     }
// })

// io.on('connection', (socket) => {

//   io.on('disconnect', ()=> {
// console.log('disconnect');
//     })
// });

server.listen(5000, () => {
  console.log('Server start');
});
