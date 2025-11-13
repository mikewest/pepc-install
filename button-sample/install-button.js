const InstallButtonState = {
  INITIAL: 0,
  LOADING_MANIFEST: 1,
  READY_TO_INSTALL: 2,
  INSTALLING: 3,
  INSTALLED: 4,
  FAILED: 5,
  NOT_ALLOWED: 6,
};

const StateNames = ['initial', 'loading-manifest', 'ready-to-install', 'installing', 'installed', 'failed', 'not-allowed'];
function stateToName(state) {
  return StateNames[state] || (() => { throw new Error(`Unknown state: ${state}`) })();
}

const INSTALL_BUTTON_CSS = `
.loading-ring {
  width: 10px;
  height: 10px;
  margin: 0 auto;
  padding: 10px;
  border: 6px dashed #4b9cdb;
  border-radius: 100%;
  display: inline-block;
  animation: loading 1.5s linear infinite;
}

@keyframes loading {
  50% {
    transform: rotate(180deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

button {
  width: max-content;
  height: max-content;
  interpolate-size: allow-keywords;
  transition: width 0.75s, height 0.75s;
}

button.install {
  background-color: #0b57d0;
  color: white;
  border: none;
  padding: 10px 48px 10px 20px;
  font-size: 16px;
  border-radius: 20px;
  position: relative;
}

button.install:not([disabled]) {
  cursor: pointer;
}

button.install:not([disabled]) > div.loading-ring {
  display: none;
}

button.install[disabled] {
  filter: grayscale(0.5);
}

button.install:not([disabled]):hover {
  filter: brightness(1.2);
}

button.install:not([disabled]):active {
  filter: brightness(0.9);
}

button.install:not([disabled])::before {
  content: "";
  position: absolute;
  background-image: url(md-download.png);
  width: 24px;
  height: 24px;
  top: 6px;
  right: 16px;
  filter: grayscale(1) brightness(100);
}

button.install > div.loading-ring {
  scale: 0.5;
  position: absolute;
}

button.install:not(.full) > dt, button.install:not(.full) > dd {
  display: none;
}

button.install.installing > div.loading-ring {
  top: -2px;
  right: 6px;
}

/** READY_TO_INSTALL state */
button.install.full {
  padding-right: 64px;
}
button.install.full > dt {
  text-align: left;
  font-size: 1.2em;
}
button.install.full > dd {
  text-align: left;
  margin-inline-start: 0;
  font-size: 0.8em;
}
button.install.full:not([disabled])::before {
  top: 16px;
}

/** INSTALLING state */
button.install.installing.full > div.loading-ring {
  top: 6px;
  right: 8px;
}

/** INSTALLED state - some states are duplicated from .install or .full */

button.installed {
  background-color: #02a839;
  color: white;
  border: none;
  padding: 10px 64px 10px 20px;
  font-size: 16px;
  border-radius: 20px;
  position: relative;
}

button.installed:not([disabled]) {
  cursor: pointer;
}

button.installed[disabled] {
  filter: grayscale(0.5);
}

button.installed:not([disabled]):hover {
  filter: brightness(1.1);
}

button.installed:not([disabled]):active {
  filter: brightness(0.9);
}

button.installed > dt {
  text-align: left;
  font-size: 1.2em;
}
button.installed > dd {
  text-align: left;
  margin-inline-start: 0;
  font-size: 0.8em;
}

button.installed:not([disabled])::before {
  content: "";
  position: absolute;
  background-image: url(md-open-in-new.png);
  width: 24px;
  height: 24px;
  top: 16px;
  right: 16px;
  filter: grayscale(1) brightness(100);
}

button.installed:not([disabled]) > div.loading-ring {
  display: none;
}
`;

/** 
 * A demo of how the <install> element might function from an
 * end-user's perspective. This implementation does not specifically
 * aim to polyfill the behavior; rather, it demonstrates the various
 * states expected of the element and how that might feel for a user.
 * */
export class AppInstallElement extends HTMLElement {
  static observedAttributes = ['src', 'manifestid'];
  #hasBeenInstalledOrLaunched = false;
  #state = InstallButtonState.INITIAL;
  #onClickBound = this.#handleClick.bind(this);

  #button;
  #titleTextNode;
  #fullTitleNode;
  #fullSubtitleNode;

  connectedCallback() {
    if (this.hasAttribute('src')) {
      console.warn('The "src" attribute for app-install is not yet supported. The fallback content will be preserved.');
      return;
    }
    const shadow = this.attachShadow({ mode: 'closed' });
    const button = document.createElement('button');
    button.setAttribute('type', 'button');
    button.classList.add('install');
    this.#button = button;

    // todo: localizability
    const textNode = document.createTextNode('Install');
    this.#titleTextNode = textNode;
    button.appendChild(textNode);

    const fullTitleNode = document.createElement('dt');
    button.appendChild(fullTitleNode);
    this.#fullTitleNode = fullTitleNode;

    const fullSubtitleNode = document.createElement('dd');
    button.appendChild(fullSubtitleNode);
    this.#fullSubtitleNode = fullSubtitleNode;

    const loadingRing = document.createElement('div');
    loadingRing.classList.add('loading-ring');
    button.appendChild(loadingRing);

    const style = document.createElement('style');
    style.textContent = INSTALL_BUTTON_CSS;
    shadow.appendChild(style);
    shadow.appendChild(button);

    button.addEventListener('click', this.#onClickBound);
  }

  disconnectedCallback() {
    this.#button.removeEventListener('click', this.#onClickBound);
  }

  installAllowable() {
    return Promise.resolve(this.#state !== InstallButtonState.NOT_ALLOWED);
  }

  hasBeenInstalledOrLaunched() {
    return this.#hasBeenInstalledOrLaunched;
  }

  #handleClick(event) {
    // This is a sample implementation that doesn't talk to the browser.
    if (this.#state === InstallButtonState.INITIAL || this.#state === InstallButtonState.FAILED) {
      this.#state = InstallButtonState.LOADING_MANIFEST;
      this.#titleTextNode.textContent = 'Loading…';
      this.#button.classList.toggle('installing', true);
      this.#button.setAttribute('disabled', '');
      setTimeout(() => {
        this.#state = InstallButtonState.READY_TO_INSTALL;
        this.#button.classList.toggle('installing', false);
        this.#button.classList.toggle('full', true);
        this.#button.removeAttribute('disabled');
        this.#titleTextNode.textContent = '';
        this.#fullTitleNode.textContent = 'Install YouTube Music';
        this.#fullSubtitleNode.textContent = 'from music.youtube.com';
        this.#button.focus();
      }, 2000);
    }
    else if (this.#state === InstallButtonState.READY_TO_INSTALL) {
      this.#state = InstallButtonState.INSTALLING;
      this.#button.classList.toggle('installing', true);
      this.#button.setAttribute('disabled', '');
      this.#fullTitleNode.textContent = 'Installing YouTube Music…';
      setTimeout(() => {
        this.#state = InstallButtonState.INSTALLED;
        this.#hasBeenInstalledOrLaunched = true;
        this.#button.classList.toggle('installing', false);
        this.#button.classList.toggle('install', false);
        this.#button.classList.toggle('installed', true);
        this.#button.removeAttribute('disabled');
        this.#fullTitleNode.textContent = 'Launch YouTube Music';
        this.#button.focus();
      }, 3000);
    }
    else if (this.#state === InstallButtonState.INSTALLED) {
      window.open('https://music.youtube.com', '_blank');
    }
    else {
      alert(`Invalid installation state: ${stateToName(this.#state)}`);
    }
  }
}
customElements.define('app-install', AppInstallElement);
