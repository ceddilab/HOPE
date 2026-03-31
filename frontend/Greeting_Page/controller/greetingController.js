const renderGreeting = (req, res) => {
  console.log("✅ Rendering greeting.ejs from controller");
  res.render('greeting', { user: null });
};

module.exports = {
  renderGreeting
};
