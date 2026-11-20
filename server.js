require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const cookieParser = require('cookie-parser');
const { Server } = require('socket.io');

const authRoutes = require('./routes/authRoutes');
const friendRoutes = require('./routes/friendRoutes');
const userRoutes = require('./routes/userRoutes');
const chatRoutes = require('./routes/chatRoutes');
const postRoutes = require('./routes/postRoutes');
const followRoutes = require('./routes/followRoutes');
const storyRoutes = require('./routes/storyRoutes');
const connectDB = require('./config/db');
const seedGroups = require('./config/seedGroups');
const initChatSocket = require('./socket/chatSocket');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use('/', authRoutes);
app.use('/', userRoutes);
app.use('/', chatRoutes);
app.use('/', postRoutes);
app.use('/', followRoutes);
app.use('/', storyRoutes);
app.use('/friends', friendRoutes);

app.use((req, res) => {
  res.status(404).send('404 - Page not found');
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).send('Something went wrong.');
});

initChatSocket(io);

const start = async () => {
  await connectDB();
  await seedGroups();
  server.listen(port, () => {
    console.log('MY realtime chat app');
    console.log('Server is running on port ' + port);
    console.log('http://localhost:' + port + '/');
  });
};

start();
