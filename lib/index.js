const cache = {};

/**
 * Snippet utils
 */
function update(str, snippet, action) {
  if (snippet) {
    switch (action) {
      case 'prepend':
        return snippet + str;
      case 'append':
        return str + snippet;
      case 'replace':
        return snippet;
      default: {
        return str + snippet;
      }
    }
  }

  return str;
}

/**
 * Delimiter-related utils
 */
function memoize(key, val) {
  if ({}.hasOwnProperty.call(cache, key)) {
    return cache[key];
  }
  cache[key] = val;
  return val;
}

function toRegex(tag, delims) {
  const key = tag + delims.join('_');
  return memoize(key, new RegExp(toMarker(tag, delims), 'g'));
}

function escape(str) {
  return str.replace(/(\W)/g, '\\$1');
}

function toMarker(tag, delims) {
  return `(?:${escape(delims[0])}\\s*(?:end)?${tag}\\s*${escape(delims[1])})`;
}

function stripTags(str, re, opts) {
  return emit(split(str, re, opts).join(''), opts);
}

function openDelim(tag, delims, opts) {
  return emit(`${delims[0]} ${tag} ${delims[1]}`, opts);
}

function closeDelim(tag, delims, opts) {
  return emit(`${delims[0]} end${tag} ${delims[1]}`, opts);
}

/**
 * String utils
 */
function toString(str) {
  if (str) {
    return str;
  }
  return '';
}

function trimRight(str) {
  return str.replace(/\s+$/, '');
}

function split(str, re, opts) {
  return toString(str).split(re).map(seg => emit(seg, opts));
}

function emit(str, opts) {
  return opts.newlines ? `${toString(str).trim()}\n` : toString(str);
}

class Inject {
  constructor(src, opts = {}) {
    if (typeof src !== 'string') {
      throw new TypeError('expected a string as the first argument.');
    }

    this.src = src;
    this.opts = Object.assign({}, Inject.defaults, opts);
  }

  toString() {
    return this.src;
  }

  static get defaults() {
    return {
      delimiters: ['<!--', '-->'],
      tag: 'snippet',
      newlines: false,
      stripTags: false
    };
  }

  append(snippet, tag, opts = {}) {
    opts = Object.assign({}, this.opts, opts);

    if (tag) {
      opts.tag = tag;
    }

    this.src = Inject.inject(this.src, snippet, opts, 'append');
    return this.src;
  }

  prepend(snippet, tag, opts = {}) {
    opts = Object.assign({}, this.opts, opts);

    if (tag) {
      opts.tag = tag;
    }

    this.src = Inject.inject(this.src, snippet, opts, 'prepend');
    return this.src;
  }

  replace(snippet, tag, opts = {}) {
    opts = Object.assign({}, this.opts, opts);

    if (tag) {
      opts.tag = tag;
    }

    this.src = Inject.inject(this.src, snippet, opts, 'replace');
    return this.src;
  }

  strip(tag, opts = {}) {
    opts = Object.assign({}, this.opts, opts);

    if (!tag) {
      tag = opts.tag;
    }

    const delims = opts.delimiters;
    const regex = opts.regex || toRegex(tag, delims);

    return stripTags(this.src, regex, opts);
  }

  stripAll() {
    return Inject.stripAll(this.src, this.opts);
  }

  static stripAll(src, opts = {}) {
    if (typeof src !== 'string') {
      throw new TypeError('expected a string as the first argument.');
    }

    opts = Object.assign({}, Inject.defaults, opts);

    const tag = '(?:[\\w\\d\\.\\-\\_\\:]+)';
    const delims = opts.delimiters;
    const regex = opts.regex || toRegex(tag, delims);

    return stripTags(src, regex, opts);
  }

  /**
   * @param  {String} `src`
   * @param  {Object} `options`
   * @return {String} Get the same string back with a snippet inserted
   */
  static inject(src, snippet, opts = {}, action = 'append') {
    if (typeof src !== 'string') {
      throw new TypeError('expected a string as the first argument.');
    }

    opts = Object.assign({}, Inject.defaults, opts);
    const delims = opts.delimiters;
    const tag = opts.tag;
    const regex = opts.regex || toRegex(tag, delims);
    const open = openDelim(tag, delims, opts);
    const close = closeDelim(tag, delims, opts);
    const trailing = /(\n+)$/.exec(src);

    // get any existing sections
    const sections = split(src, regex, opts);
    const contents = stripTags(snippet, regex, opts);

    // no snippet delimiters found, so just append the string
    if (sections.length === 1 && opts.append !== false) {
      return src;
    }

    const start = emit(sections.shift(), opts);
    const end = emit(sections.pop(), opts);
    const len = sections.length;

    let inner;
    if (len > 1 && opts.multiple !== false) {
      inner = sections.join(emit(contents, opts));
    } else if (len > 1) {
      inner = emit(sections.shift(), opts);
      inner += emit(contents, opts);
      inner += emit(sections.join('\n'), opts);
    } else if (len === 1) {
      inner = update(sections[0], contents, action);
    } else if (!len) {
      inner = emit(contents, opts);
    }

    let middle = open + inner + close;
    if (opts.stripTags === true) {
      middle = inner;
    }

    const res = start + middle + end;
    return trimRight(res) + (trailing ? trailing[0] : '');
  }
}

export default Inject;