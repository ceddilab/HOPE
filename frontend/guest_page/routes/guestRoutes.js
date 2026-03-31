const guestController = require('../controller/guestController');

const express = require('express');
const router = express.Router();
const { showGuestPage } = require('../controller/guestController');


router.get('/clustering', guestController.getClustering);
module.exports = router;

router.get('/clustering', (req, res) => {
    res.render('depot');
  });
  
  router.get("/routes", (req, res) => {
    res.render("routes");
  });
  
  router.get("/area-info", (req, res) => {
    res.render("area-info");
  });
  
  router.get('/home', (req, res) => {
    res.render('greeting');
  });
  