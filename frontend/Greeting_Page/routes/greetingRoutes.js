const express = require('express');
const router = express.Router();
const greetingController = require('../controller/greetingController');

router.get('/greeting', greetingController.renderGreeting);

module.exports = router;
