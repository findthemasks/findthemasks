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
  className && (el.className = className);
  child && ac(el, child);
  return el;
}

// Wrapper for document.createTextNode
export function ctn(text) {
  return document.createTextNode(text);
}
