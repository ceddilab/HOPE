// This is correct server-side code for handling route
const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.render("clustering"); // clustering.ejs must exist
});

module.exports = router;
