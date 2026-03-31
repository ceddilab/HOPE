exports.showLoginPage = (req, res) => {
  res.render('login');
};

exports.loginUser = (req, res) => {
  const { email, password } = req.body;

  // Dummy check for now
  if (email === 'test@example.com' && password === '123456') {
    req.session.user = { email };
    res.redirect('/dashboard');
  } else {
    res.redirect('/login');
  }
};
