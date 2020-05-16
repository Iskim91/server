const express = require('express');
const socketio = require('socket.io');
const http = require('http');
const cors = require('cors');

const PORT = process.env.PORT || 5000

const router = require('./router');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const { addUser, removeUser, getUser, getUsersInRoom } = require('./users.js')

io.on('connection', (socket) => {
  console.log("We have a new connection");

  // gets the information from the chat
  socket.on('join', ({name, room}, callback) => {
    // uses the functions from ./users.js
    const {error, user} = addUser({ id: socket.id, name, room});

    if (error) return callback(error);

    // the new user gets a welcome message
    socket.emit('message', {user: 'admin', text: `${user.name}, welcome to the room ${user.room}`})
    // the rest of the members get a broadcast that a new user has joined
    socket.broadcast.to(user.room).emit('message', { user: 'admin', text: `${user.name} has joined!`})

    socket.join(user.room);

    io.to(user.room).emit('roomData', {room: user.room, users: getUsersInRoom(user.room) })

    callback();

  });

  // when an even is emited with the 'sendMessage'
  socket.on('sendMessage', (message, callback) => {
    // the socket.id is what is used to save the user
    const user = getUser(socket.id);
    // this will show in the front end. this will be recieved from the Message controller
    io.to(user.room).emit('message', {user: user.name, text: message});
    io.to(user.room).emit('roomData', {room: user.room, users: getUsersInRoom(user.room) });

    callback();
  })

  // logs out of the session
  socket.on('disconnect', () => {
    const user = removeUser(socket.id);

    if (user) {
      io.to(user.room).emit('message', { user: 'admin', text: `${user.name} has left`});
    }
  })


});



app.use(router);
app.use(cors());

server.listen(PORT, () => console.log(`Server has started on port ${PORT}`));
