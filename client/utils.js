// Takes a string of HTML elements and returns an array of elements.
export function htmlToElements(html) {
  return document.createRange().createContextualFragment(html).children;
}

// Wrapper for Node.appendChild.
// child (either a node or an array of nodes) is appended to the parent element
export function ac(el, child) {
  if (el && child) {
    if (Array.isArray(child)) {
      child.forEach((c) => el.appendChild(c));
    } else {
      el.appendChild(child);
    }
  }
}

// Wrapper for document.createElement - creates an element of type elementName
// if className is passed, assigns class attribute
// if child (either a node or an array of nodes) is passed, appends to created element.
export function ce(elementName, className, child) {
  const el = document.createElement(elementName);
  if (className) {
    el.className = className;
  }
  if (child) {
    ac(el, child);
  }
  return el;
}

// Wrapper for document.createTextNode
export function ctn(text) {
  return document.createTextNode(text);
}

const getSearch = (params) => {
  const searches = [];

  for (const key of Object.keys(params)) {
    searches.push(`${key}=${params[key] || ''}`);
  }

  if (searches.length > 0) {
    return `?${searches.join('&')}`;
  }

  return '';
};

export class FtmUrl {
  constructor(url) {
    const parser = document.createElement('a');
    if (url) {
      parser.href = url.toString() || '';
    }

    const qs = parser.search.replace(/^\?/, '').split('&');
    const searchparams = {};

    for (const q of qs) {
      const pair = q.split('=');
      if (pair.length > 1 && pair[0]) {
        searchparams[pair[0]] = pair[1] || '';
      }
    }

    this.protocol = parser.protocol;
    this.host = parser.host;
    // this.hostname = parser.hostname;
    // this.port = parser.port;
    this.pathname = parser.pathname;
    // this.search = parser.search;
    this.searchparams = searchparams;
    this.hash = parser.hash;
  }

  toString() {
    return `${this.protocol}//${this.host}${this.pathname}${getSearch(this.searchparams)}${this.hash}`;
  }
}
