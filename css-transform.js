const path = require('path');
const compileCss = require('./build/compile-css.js');

module.exports = async (ctx, next) => {
  const ext = path.extname(ctx.path);
  const match = (ext === '.css');
  if (!match) {
    return next();
  }

  const filename = ctx.path.slice(1);
  ctx.response.type = 'text/css';
  ctx.response.body = await compileCss(filename);
};
