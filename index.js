const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const app = express();
const route = require('./route');
const { users, addUser } = require('./users');

app.use(express.json());
app.use(cors({ origin: '*' }));
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
