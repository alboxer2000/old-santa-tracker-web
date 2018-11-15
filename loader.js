const babel = require('@babel/core');
const buildResolveBareSpecifiers = require('./build/babel/resolve-bare-specifiers.js');
const buildTemplateTagReplacer = require('./build/babel/template-tag-replacer.js');
const compileCss = require('./build/compile-css.js');
const compileScene = require('./build/compile-scene.js');
const fsp = require('./build/fsp.js');
const path = require('path');
const rollup = require('rollup');
const rollupNodeResolve = require('rollup-plugin-node-resolve');
const JSON5 = require('json5');


const matchSceneRe = /(?:^|\/)scenes\/([a-z]+)(?:\/(.*)|)$/;


/**
 * @param {string} filename to match for foo/foo-scene.min.js
 * @return {?string} the matched foo, or null
 */
function matchSceneMin(filename) {
  const match = matchSceneRe.exec(filename);
  if (!match) {
    return null;
  }
  const sceneName = match[1];
  const rest = match[2];

  if (rest === `${sceneName}-scene.min.js`) {
    return sceneName;
  }
  return null;
}


function bundleWarn(warning, sub) {
  if (warning.code !== 'EVAL') {
    // Closure uses eval() through its generated code, so ignore this for now.
    return sub(warning);
  }
}


const messages = require('./en_src_messages.json');


function templateTagReplacer(name, arg) {
  switch (name) {
    case '_msg': {
      const object = messages[arg];
      return object && (object.raw || object.message) || '?';
    }
    case '_style': {
      return compileCss(`styles/${arg}.scss`);
    }
  }
}


/**
 * Bundles a real source file up with Rollup.
 * 
 * @param {string} filename
 * @return {string}
 */
async function bundleCode(filename) {
  const virtualCache = {};
  const virtualLoader = {
    name: 'rollup-virtual-loader',
    async resolveId(id, importer) {
      if (importer === undefined) {
        return;
      }
      const resolved = path.resolve(path.dirname(importer), id);

      // call back out to our loader if we have further deps
      const out = await loader(resolved);
      if (out) {
        virtualCache[resolved] = out;
        return resolved;
      }
    },
    load(id) {
      const out = virtualCache[id];
      return out !== undefined ? {code: out.body, map: out.map} : undefined;
    },
  };

  const bundle = await rollup.rollup({
    input: filename,
    plugins: [rollupNodeResolve(), virtualLoader],
    onwarn: bundleWarn,
  });

  const out = await bundle.generate({
    name: filename,
    format: 'es',
    sourcemap: true,
  });
  out.map.sourceRoot = path.relative(path.dirname(filename), '.');
  return out;
}


/**
 * @param {string} filename to load
 * @return {?{
 *   body: string,
 *   map: !Object,
 * }}
 */
async function loader(filename) {
  if (filename.startsWith('third_party/')) {
    return null;
  }

  const parsed = path.parse(filename);

  if (parsed.ext === '.css') {
    return {body: await compileCss(filename)};
  } else if (parsed.ext !== '.js') {
    return null;
  }

  let body = null;
  let map = null;
  const babelPlugins = [];

  if (parsed.name.endsWith('.min')) {
    // try to match scene JS
    const sceneName = matchSceneMin(filename);
    if (!sceneName) {
      return null;  // do nothing to .min.js unless it's a scene
    }
    const out = await compileScene({sceneName});
    ({js: body, map} = out);
  } else if (parsed.name.endsWith('.bundle')) {
    // completely bundles code
    const clean = parsed.name.substr(0, parsed.name.length - '.bundle'.length) + '.js';
    const out = await bundleCode(path.join(parsed.dir, clean));
    ({code: body, map} = out);
  } else if (parsed.name.endsWith('.json') || parsed.name.endsWith('.json5')) {
    // convert JSON/JSON5 to an exportable module
    const raw = await fsp.readFile(path.join(parsed.dir, parsed.name), 'utf8');
    const json = JSON5.parse(raw);
    body = `const o=${JSON.stringify(json)};export default o;`;
  } else {
    // regular JS file
    body = await fsp.readFile(filename, 'utf8');
    babelPlugins.push(buildResolveBareSpecifiers(filename));
    babelPlugins.push(buildTemplateTagReplacer(templateTagReplacer));
  }

  if (babelPlugins.length) {
    const result = await babel.transformAsync(body, {
      filename,
      plugins: babelPlugins,
      sourceMaps: true,
      sourceType: 'module',
      retainLines: true,
    });
    ({code: body, map} = result);
  }

  // remove sourceRoot by flattening all deps
  if (map !== null) {
    const dirname = path.dirname(filename);
    const sourceRoot = map.sourceRoot || '.';
    map.sources = (map.sources || []).map((f) => path.join(dirname, sourceRoot, f));
    delete map.sourceRoot;
  }

  return body !== null ? {body, map} : null;
}

module.exports = loader;