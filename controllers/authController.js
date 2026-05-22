exports.renderHome = (req, res) => {
  res.render('home');
};

exports.renderLogin = (req, res) => {
  const username = req.query.username || '';
  res.render('login', { username });
};

exports.renderSignup = (req, res) => {
  res.render('signup');
};

exports.renderAbout = (req, res) => {
  res.send('This is my first chat application');
};

exports.signup = (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.send('All fields are required');
  }

  if (password.length < 6) {
    return res.send('Password too short');
  }

  console.log('Signup details:', username, email);
  return res.redirect(`/login?username=${encodeURIComponent(username)}`);
};

exports.login = (req, res) => {
  const { email, password } = req.body;

  console.log('Login details:', email, password);
  res.send('Login Successful');
};
