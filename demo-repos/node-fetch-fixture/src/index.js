const fetch = require('node-fetch');

async function getJson(url) {
  const response = await fetch(url);
  const data = await response.json();
  return data;
}

async function getText(url) {
  const response = await fetch(url);
  const text = await response.text();
  return text;
}

module.exports = { getJson, getText };
