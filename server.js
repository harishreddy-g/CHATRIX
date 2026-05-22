const express = require('express');
const path = require('path');
const authRoutes = require('./routes/authRoutes');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use('/', authRoutes);

console.log('MY realtime chat app');
app.listen(port, () => {
  console.log('Server is running on port ' + port);
});