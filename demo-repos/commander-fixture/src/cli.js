const { Command } = require('commander');

function buildCli() {
  const program = new Command();

  program
    .name('demo-cli')
    .description('A demo CLI for Patchwork fixture testing')
    .version('1.0.0');

  program
    .option('-p, --port <number>', 'port to listen on', '3000')
    .option('-H, --host <string>', 'host to bind', 'localhost')
    .option('-v, --verbose', 'enable verbose logging');

  return program;
}

function getConfig(program) {
  // In commander 8.x you could access options directly on the program object
  // In 12.x you must use program.opts()
  return {
    port: parseInt(program.port || '3000', 10),
    host: program.host || 'localhost',
    verbose: Boolean(program.verbose),
  };
}

module.exports = { buildCli, getConfig };
