const express = require('express');

function createApp() {
  const app = express();

  app.get('/', function (req, res) {
    res.json({ status: 'ok' });
  });

  app.get('/hello/:name', function (req, res) {
    res.json({ message: 'Hello ' + req.params.name });
  });

  // Express 4 wildcard pattern — changes in Express 5
  app.get('/files/*', function (req, res) {
    res.json({ path: req.params[0] });
  });

  // req.param() helper — removed in Express 5
  app.get('/search', function (req, res) {
    const q = req.param('q', 'default');
    res.json({ query: q });
  });

  app.use(function (err, req, res, next) {
    res.status(500).json({ error: err.message });
  });

  return app;
}

module.exports = { createApp };
