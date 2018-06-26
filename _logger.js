function c(method) {
  // eslint-disable-next-line no-console
  return (...args) => {
    if (typeof args[0] !== 'string') {
      const obj = args.shift();
      if (obj.req) args.push('\nurl: ' + obj.req.url);
      if (obj.err) args.push('\n' + obj.err.stack);
    }

    if (typeof args[0] === 'string') {
      args[0] = `[sls] ${args[0]}`;
    }

    console[method](...args);
  };
}

try {
  // eslint-disable-next-line global-require, import/no-extraneous-dependencies
  module.exports = require('baldera-logger')('tera-proxy-sls');
} catch (err) {
  module.exports = {
    trace: () => {},
    debug: () => {},
    info: c('log'),
    warn: c('warn'),
    error: c('error'),
    fatal: c('error'),
  };
}
