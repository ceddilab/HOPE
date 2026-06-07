const renderGreeting = (req, res) => {
  // `user` comes from res.locals (set by the auth middleware in app.js).
  // Don't pass `user` here or it would override the real logged-in state.
  res.render('greeting');
};

module.exports = {
  renderGreeting
};
