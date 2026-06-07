// The login form is submitted by browser JS (login.js) directly to the backend
// (/api/auth/login), which issues the httpOnly JWT session cookie. This controller
// only needs to render the login page; there is no server-side form handler here.
exports.showLoginPage = (req, res) => {
  res.render('login');
};
