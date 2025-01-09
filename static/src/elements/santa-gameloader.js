import styles from './santa-gameloader.css';

import * as messageSource from '../lib/message-source.js';
import {resolvable, dedup} from '../lib/promises.js';

import '../../src/polyfill/attribute.js';


class PortControl {
  constructor() {
    this._port = null;
    this._done = false;
    this._attached = false;
    this._closed = false;

    this._nextPromise = null;
    this._nextResolve = null;
    this._q = [];
  }

  attach(port) {
    if (this._attached || this._done) {
      throw new Error('cannot attach twice');
    }
    if (port) {
      this._port = port;
      port.onmessage = (ev) => this.push(ev.data);
    } else {
      this._closed = true;
    }
    this._attached = true;
  }

  get hasPort() {
    return Boolean(this._port);
  }

  get isAttached() {
    return this._attached;
  }

  send(x) {
    if (this._port) {
      this._port.postMessage(x);
    }
  }

  shutdown() {
    if (this._done) {
      throw new Error('cannot shutdown twice');
    }

    this._done = true;
    this._attached = false;
    this.push(null);  // safe even if this goes to queue

    return () => {
      this._closed = true;
      if (this._port) {
        this._port.close();
      }
      this._port = null;
    };
  }

  get done() {
    return this._done;
  }

  push(arg) {
    if (typeof arg !== 'object') {
      console.warn('got unhandled message from client', arg);
      return;
    }

    if (this._nextResolve) {
      this._nextResolve(arg);
      this._nextResolve = null;
      this._nextPromise = null;
    } else {
      this._q.push(arg);
    }
  }

  next() {
    if (this._closed) {
      return null;
    } else if (this._q.length) {
      return this._q.shift();
    } else if (this._done) {
      return null;
    } else if (!this._nextPromise) {
      this._nextPromise = new Promise((resolve) => {
        this._nextResolve = resolve;
      });
    }
    return this._nextPromise;
  }
}



const EMPTY_PAGE = 'data:text/html;base64,';
const LOAD_LEEWAY = 250;
const LOAD_TIMEOUT = 10 * 1000;  // 10s

// nb. allow-same-origin is fine, because we're serving on another domain
// allow-top-navigation and friends are allowed for Android
// TODO(samthor): We only need this for dev to play nice, don't even add it in prod.
const IFRAME_SANDBOX = 'allow-forms allow-same-origin allow-scripts allow-popups allow-top-navigation allow-top-navigation-by-user-activation';
const IFRAME_ALLOW = 'autoplay';  // nb. could add 'accelerometer', but only for Chrome


export const events = Object.freeze({
  'load': '-loader-load',
  'prepare': '-loader-prepare',
  'error': '-loader-error',
});
const internalRemove = '-internal-remove';


const removeNode = (el) => {
  if (el && el.parentNode) {
    el.parentNode.removeChild(el);
  }
};


/**
 * Set the explicit w/h of the target iframe. Used to work around Safari issues.
 *
 * @param {?HTMLIFrameElement} iframe to rectify
 * @param {boolean} tilt whether the screen is rotated
 */
const rectifyFrame = (iframe, tilt) => {
  if (!iframe) {
    return;
  }

  let targetWidth = window.innerWidth;
  let targetHeight = window.innerHeight;

  if (tilt) {
    let temp = targetWidth;
    targetWidth = targetHeight;
    targetHeight = temp;
  }

  delete iframe.style.width;
  delete iframe.style.height;
  iframe.offfsetLeft;

  if (iframe.offsetHeight !== targetHeight || iframe.offsetWidth !== targetWidth) {
    iframe.style.width = `${targetWidth}px`;
    iframe.style.height = `${targetHeight}px`;
  }
};


export const createFrame = (src) => {
  const iframe = document.createElement('iframe');
  iframe.src = src || EMPTY_PAGE;
  iframe.setAttribute('sandbox', IFRAME_SANDBOX);
  iframe.setAttribute('allow', IFRAME_ALLOW);
  iframe.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');
  return iframe;
};


/**
 * Loads iframes.
 */
class SantaGameLoaderElement extends HTMLElement {
  static get observedAttributes() { return ['disabled', 'tilt']; }

  constructor() {
    super();
    this._resizeCheckLeft = 0;

    const root = this.attachShadow({mode: 'open'});
    root.adoptedStyleSheets = [styles];

    // Use this container to manage focus on contained iframes, rather than setting classes or
    // attributes on the loader itself.
    this._main = document.createElement('main');
    this._main.classList.add('empty');
    root.appendChild(this._main);

    // Wrap `<slot>` in a container that can be toggled in an error state. The naked slot contains
    // content which will be displayed if a game fails to load, such as `<santa-error>`.
    const slotContainer = document.createElement('div');
    slotContainer.classList.add('slot-container');
    const slot = document.createElement('slot');
    slotContainer.appendChild(slot);

    // Create `.iframe-container` for rotate/etc effects.
    this._container = document.createElement('div');
    this._container.className = 'iframe-container';

    this._main.appendChild(slotContainer);
    this._main.appendChild(this._container);

    this._onWindowResize = dedup(this._onWindowResize.bind(this));

    this._loading = false;
    this._control = new PortControl();

    this._href = null;
    this._previousFrame = null;
    this._previousFrameClose = null;  // called when _previousFrame is cleared
    this._activeFrame = createFrame();
    this._container.appendChild(this._activeFrame);

    // Create DOM that contains overlay elements.
    // TODO(samthor): This isn't really to do with the gameloader, but serves as a convinent place
    // to place elements which are intended to look like they're part of the game (tutorial,
    // rotate, level up indicators).

    const overlay = document.createElement('div');
    overlay.classList.add('overlay');

    const holder = document.createElement('div');
    holder.classList.add('holder');

    const slotOverlay = document.createElement('slot');
    slotOverlay.setAttribute('name', 'overlay');

    root.appendChild(overlay);
    overlay.appendChild(holder);
    holder.appendChild(slotOverlay);
  }

  _onWindowResize() {
    if (!this._resizeCheckLeft) {
      this._resizeCheckLeft = 16;  // check for 16 frames
      this._checkWindowResize();
    }
  }

  _checkWindowResize() {
    if (this._resizeCheckLeft) {
      --this._resizeCheckLeft;
      window.requestAnimationFrame(() => this._checkWindowResize());
    }

    // Safari (and others) won't resize an iframe correctly. If we find that their size is invalid,
    // then force it via changing CSS properties.
    const tilt = this.hasAttribute('tilt');
    rectifyFrame(this._activeFrame, tilt);
    rectifyFrame(this._previousFrame, tilt);
  }

  connectedCallback() {
    window.addEventListener('resize', this._onWindowResize);
  }

  disconnectedCallback() {
    window.addEventListener('resize', this._onWindowResize);
  }

  attributeChangedCallback(attrName, oldValue, newValue) {
    switch (attrName) {
      case 'disabled':
        if (newValue !== null) {
          window.focus();  // move focus from activeFrame
          this._activeFrame.setAttribute('tabindex', -1);
        } else if (!this._loading) {
          this._activeFrame.removeAttribute('tabindex');
        }
        break;

      case 'tilt':
        this._onWindowResize();
        break;
    }
  }

  /**
   * Optionally purge any `previousFrame` that is being held during a load. Called by transition
   * code to clear content once we're done with it.
   */
  purge() {
    // nb. does not null out the previousFrame, as we use it to indicate in-progress load
    removeNode(this._previousFrame);
    this._previousFrameClose && this._previousFrameClose();
  }

  /**
   * Load a new scene.
   *
   * @param {?string} href
   * @param {?*} context to pass via .load event
   */
  load(href, context=null) {
    this._href = href || null;

    this._loading = true;
    this._main.classList.add('loading');

    // Inform any open control (for the activeFrame) that it is to be closed, by sending null.
    const close = this._control.shutdown();
    this._control = new PortControl();

    if (this._previousFrame) {
      // If there's still a previousFrame set, then the previous activeFrame never loaded. Clear it
      // and dispatch an internal message: it was never made visible to end-users.
      // TODO: revisit if both frames are visible at the same time for a transition
      this._activeFrame.dispatchEvent(new CustomEvent(internalRemove));
      removeNode(this._activeFrame);
      close();  // frame has gone immediately, close port now
    } else {
      // Whatever was active is now ultimately going to meet its demise.
      this._previousFrame = this._activeFrame;
      this._previousFrame.setAttribute('tabindex', -1);  // prevent tab during clear
      window.focus();  // move focus from previousFrame

      // Configure a final close helper for when the previousFrame is actually removed.
      this._previousFrameClose = close;
    }

    // Inform listeners that there's a new load occuring. This will likely start the display of a
    // loading interstitial or similar (although can fire multiple times).
    this.dispatchEvent(new CustomEvent(events.load, {detail: {context}}));

    const af = createFrame(this._href);
    this._activeFrame = af;
    this._activeFrame.classList.add('pending');
    this._activeFrame.setAttribute('tabindex', -1);  // prevent tab during load
    this._container.appendChild(af);

    // TODO(samthor): Remove after iOS tests.
    af.contentWindow.addEventListener('gesturestart', (ev) => {
      console.info('got gesture on window');
    }, {passive: true});

    let portPromise = Promise.resolve(null);
    if (href) {
      portPromise = new Promise((resolve, reject) => {

        // Resolves with a MessagePort from the frame.
        // nb. This needs to happen _after_ being added to the DOM, otherwise .contentWindow is null.
        messageSource.add(af.contentWindow, (ev) => {
          if (ev.data !== 'init' || !(ev.ports[0] instanceof MessagePort)) {
            return reject(new Error(`unexpected from preload: ${ev.data}`));
          }
          resolve(ev.ports[0]);
        });

        // Handle being removed due to being replaced with some other frame before being loaded.
        af.addEventListener(internalRemove, () => resolve(null), {once: true});

        // Needed for non-Chrome to finally reject a load.
        window.setTimeout(() => resolve(null), LOAD_TIMEOUT);

        // Resolves with null after load + delay, indicating that the scene has failed to init. The
        // loader should normally resolve with its MessagePort.
        af.addEventListener('load', () => {
          window.setTimeout(() => resolve(null), href ? LOAD_LEEWAY : 0);

          // TODO(samthor): If another load event arrives, this is because the internal <iframe>
          // loaded a new URL. We should kill it in this case.
          af.addEventListener('load', (ev) => {
            console.warn('got inner load, should kill frame', af);
            af.contentWindow.location.replace('about:blank');
          }, {once: true});
        }, {once: true});

      });
    }

    // nb. This method should never fail for external reasons; failures here are an internal issue.
    return this._prepareFrame(portPromise, af, context);
  }

  async _prepareFrame(portPromise, af, context) {
    const port = await portPromise;
    if (af !== this._activeFrame) {
      return false;  // another frame was requested before initial init message
    }
    this._control.attach(port);

    let readyResolve;
    const readyPromise = new Promise((resolve) => {
      readyResolve = resolve;
    });
    const ready = () => {
      if (af !== this._activeFrame) {
        readyResolve(false);
        return false;
      } else if (!this._loading) {
        return true;  // ready was called twice
      }

      // Kick Safari, to work around a scroll issue. Safari refuses to scroll the page unless it is
      // resized first, for some reason. It must be an actual resize, hence the "- 1px" below.
      af.style.maxHeight = 'calc(100% - 1px)';
      window.requestAnimationFrame(() => {
        af.style.maxHeight = null;
      });

      // Success: the frame has reported ready. The following code is entirely non-async, and just
      // cleans up state as the scene is now active and happy.

      if (this.disabled) {
        // Retain `tabindex=-1`, which prevents use of the iframe.
      } else {
        this._activeFrame.removeAttribute('tabindex');
      }

      this._loading = false;
      this._activeFrame.classList.remove('pending');
      this._main.classList.remove('loading');

      // If nothing loaded, allow <slot> content and remove itself. This is still "success".
      this._main.classList.toggle('empty', !port);
      if (port === null) {
        removeNode(this._activeFrame);
      }

      this.purge();
      this._previousFrame = null;
      this._previousFrameClose = null;

      readyResolve(true);
      return true;
    };

    const {promise: scenePromise, resolve: sceneResolve} = resolvable();

    // Ensure that `ready` is always called. And, that if the scene runner has an uncaught error,
    // it is announced.
    scenePromise.then(ready, (error) => {
      if (af === this._activeFrame) {
        const detail = {error, context};
        this.dispatchEvent(new CustomEvent(events.error, {detail}));
      } else {
        console.warn('error from closed scene', af.src, error)
      }
    });

    // Announce to the caller that it can now prepare a new frame, listening to control events and
    // doing work. Control can also be null if the scene failed to load or is the blank page.
    const detail = {
      context,
      control: this._control,
      resolve: sceneResolve,
      ready,  // "call me when done"
      href: this._href,
    };
    this.dispatchEvent(new CustomEvent(events.prepare, {detail}));
    return readyPromise;
  }

  get href() {
    return this._href;
  }

  get disabled() {
    return this.hasAttribute('disabled');
  }

  set disabled(v) {
    this.toggleAttribute('disabled', v);
  }

  focus() {
    // TODO: should we overload focus?
    if (!this._activeFrame.hasAttribute('tabindex')) {
      this._activeFrame.focus();
    }
  }
}


customElements.define('santa-gameloader', SantaGameLoaderElement);