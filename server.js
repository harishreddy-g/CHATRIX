const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/authRoutes');
const friendRoutes = require('./routes/friendRoutes');
const userRoutes = require('./routes/userRoutes');
const connectDB = require('./config/db');

const app = express();
const port = process.env.PORT || 3000;
connectDB();
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use('/', authRoutes);
app.use('/', userRoutes);
app.use('/friends', friendRoutes);

console.log('MY realtime chat app');
app.listen(port, () => {
  console.log('Server is running on port ' + port);
  console.log('http://localhost:3000/');
});
