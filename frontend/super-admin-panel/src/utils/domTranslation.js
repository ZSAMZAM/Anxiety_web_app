const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'CODE', 'PRE']);
const ATTRIBUTES = ['placeholder', 'title', 'aria-label'];

const normalize = (value = '') => value.replace(/\s+/g, ' ').trim();

const preserveWhitespace = (source, translated) => {
  const leading = source.match(/^\s*/)?.[0] || '';
  const trailing = source.match(/\s*$/)?.[0] || '';
  return `${leading}${translated}${trailing}`;
};

const translateValue = (value, phrases) => {
  const trimmed = normalize(value);
  if (!trimmed) return value;
  return phrases?.[trimmed] || value;
};

const translateTextNode = (node, phrases, language) => {
  const source = node.__i18nSourceText || node.nodeValue;
  const translated = language === 'en' ? source : translateValue(source, phrases);
  if (translated !== source) {
    node.__i18nSourceText = source;
  }
  node.nodeValue = preserveWhitespace(node.nodeValue, translated);
};

const translateAttributes = (element, phrases, language) => {
  ATTRIBUTES.forEach((attribute) => {
    if (!element.hasAttribute(attribute)) return;
    const sourceAttribute = `data-i18n-source-${attribute}`;
    const source = element.getAttribute(sourceAttribute) || element.getAttribute(attribute);
    const translated = language === 'en' ? source : translateValue(source, phrases);
    if (translated !== source && !element.hasAttribute(sourceAttribute)) {
      element.setAttribute(sourceAttribute, source);
    }
    if (element.getAttribute(attribute) !== translated) {
      element.setAttribute(attribute, translated);
    }
  });
};

const walkAndTranslate = (root, phrases, language) => {
  if (!root) return;
  if (root.nodeType === Node.TEXT_NODE) {
    translateTextNode(root, phrases, language);
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE || SKIP_TAGS.has(root.tagName)) return;

  translateAttributes(root, phrases, language);

  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
    {
      acceptNode(node) {
        if (node.nodeType === Node.ELEMENT_NODE && SKIP_TAGS.has(node.tagName)) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    },
  );

  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      translateTextNode(node, phrases, language);
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      translateAttributes(node, phrases, language);
    }
  });
};

export const installDomTranslator = ({ language, phrases }) => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return undefined;

  const run = () => walkAndTranslate(document.body, phrases, language);
  window.requestAnimationFrame(run);

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => walkAndTranslate(node, phrases, language));
      if (mutation.type === 'attributes') {
        walkAndTranslate(mutation.target, phrases, language);
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ATTRIBUTES,
  });

  return () => observer.disconnect();
};
