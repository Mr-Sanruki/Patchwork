const chalk = require('chalk');

function formatSuccess(msg) {
  return chalk.green.bold(msg);
}

function formatError(msg) {
  return chalk.red.underline(msg);
}

function formatWarning(msg) {
  return chalk.yellow(msg);
}

module.exports = { formatSuccess, formatError, formatWarning };
