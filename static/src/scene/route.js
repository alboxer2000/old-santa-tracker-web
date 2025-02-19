
/**
 * @fileoverview Route helpers designed for static scope only.
 *
 * TODO: can also be used by prod.
 */

function determine() {
  if (window.top != window && document.referrer) {
    const scope = new URL('./', document.referrer);
    return {
      scope: scope.toString(),
      page: document.referrer,
    };
  }
  const scope = new URL('./', window.location);
  return {scope: scope.toString(), page: window.location.href};
}

export const {scope, page} = determine();

export const internalNavigation = (cand) => {
  const check = new URL(cand);
  const derived = new URL(check.hash, page);
  return check.toString() === derived.toString() ? check.hash : null;
};

/**
 * @param {string} cand candidate href
 * @return {string} href with scope as appropriate
 */
export const href = (cand) => {
  return cand == null ? cand : new URL(cand, page);
};

/**
 * @param {string} sceneName
 * @return {string} href with scope as appropriate
 */
export const hrefForScene = (sceneName) => {
  if (sceneName) {
    return href(sceneName + '.html');
  }
  return href('./');
};

/**
 * Rectify anything found under the passed element, that has a `[href]`.
 *
 * @param {!Element} el to rectify links under
 */
export const rectify = (el) => {
  const hrefs = el.querySelectorAll('[href]');
  for (let i = 0; i < hrefs.length; ++i) {
    const c = hrefs[i];
    const url = href(c.getAttribute('href'));
    c.setAttribute('href', url.toString());
  }
};

/**
 * @param {string} htmlString raw HTML to resolve containing e.g. <a href="scene.html">
 * @return {!DocumentFragment}
 */
export const resolve = (htmlString) => {
  const node = document.createElement('template');
  node.innerHTML = htmlString;
  rectify(node);  // noop without scope
  return node.content;
};
