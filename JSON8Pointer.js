(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.JSON8Pointer = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict'

var encode = require('./lib/encode')
var decode = require('./lib/decode')

module.exports.context = require('./lib/context')
module.exports.decode = decode
module.exports.dict = require('./lib/dict')
module.exports.serialize = encode
module.exports.encode = encode
module.exports.escape = require('./lib/escape')
module.exports.parse = decode
module.exports.find = require('./lib/find')
module.exports.flatten = require('./lib/flatten')
module.exports.index = require('./lib/index')
module.exports.join = require('./lib/join')
module.exports.unescape = require('./lib/unescape')
module.exports.unflatten = require('./lib/unflatten')
module.exports.validArrayToken = require('./lib/validArrayToken')

},{"./lib/context":2,"./lib/decode":3,"./lib/dict":4,"./lib/encode":5,"./lib/escape":6,"./lib/find":7,"./lib/flatten":8,"./lib/index":9,"./lib/join":10,"./lib/unescape":11,"./lib/unflatten":12,"./lib/validArrayToken":13}],2:[function(require,module,exports){
'use strict'

var validArrayToken = require('./validArrayToken')
var OBJECT = 'object'

/**
 * Get the last token and parent
 *
 * @param {Object|Array} doc     - JSON document
 * @param {Array}        tokens  - array of tokens
 * @return {Array}               - [token, target]
 */
module.exports = function context(doc, tokens) {
  var length = tokens.length

  var i = 0
  var target = doc
  var token

  while (i < length - 1) {
    token = tokens[i++]

    if (Array.isArray(target)) {
      validArrayToken(token, target.length)
    }
    else if (typeof target !== OBJECT || target === null) {
      throw new Error('Cannot be walked')
    }

    if (typeof Map !== 'undefined' && target instanceof Map) {
      target = target.get(token)
    }
    else if (typeof Set !== 'undefined' && target instanceof Set) {
      var c = 0
      target.forEach(function (item) { // eslint-disable-line
        if (c === +token) target = item
        else c++
      })
    }
    else {
      target = target[token]
    }
  }

  token = tokens[i]

  if (Array.isArray(target)) {
    validArrayToken(token, target.length)
  }
  else if (typeof target !== OBJECT || target === null) {
    throw new Error('Invalid target')
  }

  return [token, target]
}

},{"./validArrayToken":13}],3:[function(require,module,exports){
'use strict'

/**
 * decode a JSON Pointer string
 *
 * @param  {String} pointer    - JSON Pointer string to decode
 * @param  {String} separator  - separator to use, defaults to /
 * @return {Array}             - array of tokens
 */
module.exports = function decode(pointer, separator) {
  if (Array.isArray(pointer)) return pointer

  var sep = typeof separator === 'string' && separator.length > 0 ? separator : '/'

  if (pointer.length === 0) return []

  if (pointer.charAt(0) !== sep) throw new Error('Invalid pointer: ' + pointer)

  var tokens = ['']
  var c = 0

  for (var i = 1, len = pointer.length; i < len; i++) {
    var l = pointer.charAt(i)
    if (l === sep) {
      tokens.push('')
      c++
    }
    else if (l === '~') {
      if (pointer.charAt(i + 1) === '1') {
        tokens[c] += sep
        i++
      }
      else if (pointer.charAt(i + 1) === '0') {
        tokens[c] += '~'
        i++
      }
      else {
        tokens[c] += l
      }
    }
    else {
      tokens[c] += l
    }
  }

  return tokens
}

},{}],4:[function(require,module,exports){
'use strict';

var walk = require('./walk')

module.exports = function index (json) {
  var dict = Object.create(null)
  walk(json, function (value, pointer) {
    if (typeof value !== 'object' || value === null) {
      dict[pointer] = value
    }
  })
  return dict
}

},{"./walk":14}],5:[function(require,module,exports){
'use strict'

var escape = require('./escape')

/**
 * Encode a JSON tokens list
 *
 * @param  {Array}  tokens     - array of tokens
 * @param  {String} separator  - separator to use, defaults to /
 * @return {String}            - JSON Pointer string
 */
module.exports = function encode(tokens, separator) {
  var pointer = ''
  var sep = typeof separator === 'string' && separator.length > 0 ? separator : '/'

  for (var i = 0, len = tokens.length; i < len; i++) {
    pointer += sep + escape(tokens[i], sep)
  }

  return pointer
}

},{"./escape":6}],6:[function(require,module,exports){
'use strict'

/**
 * Escape a token for use in JSON Pointer
 *
 * @param  {String} token      - array of tokens
 * @param  {String} separator  - separator to use, defaults to /
 * @return {String}            - escaped token
 */
module.exports = function escape(token, separator) {
  var sep = typeof separator === 'string' && separator.length > 0 ? separator : '/'
  var escaped = ''
  for (var i = 0, length = token.length; i < length; i++) {
    var l = token.charAt(i)
    if (l === '~')
      escaped += '~0'
    else if (l === sep)
      escaped += '~1'
    else
      escaped += l
  }
  return escaped
}

},{}],7:[function(require,module,exports){
'use strict'

var decode = require('./decode')
var context = require('./context')

/**
 * Get the value at the JSON Pointer location
 *
 * @param  {Object|Array} doc      - JSON document
 * @param  {String|Array} pointer  - JSON Pointer string or tokens array
 * @return {Any}                   - value at the JSON Pointer location - undefined otherwise
 */
module.exports = function find(doc, pointer) {
  var tokens = Array.isArray(pointer) ? pointer : decode(pointer)

  // returns the document
  if (tokens.length === 0) return doc

  var r

  try {
    r = context(doc, tokens)
  }
  catch (e) {
    return undefined
  }

  var token = r[0]
  var parent = r[1]
  return parent[token]
}

},{"./context":2,"./decode":3}],8:[function(require,module,exports){
(function (global){
'use strict';

var walk = require('./walk')

module.exports = function index (json) {
  var idxs = Object.create(null)
  walk(json, function (value, pointer) {
    var v
    if (Array.isArray(value)) {
      v = []
    } else if (global.Map && value instanceof Map) {
      v = new Map()
    } else if (global.Set && value instanceof Set) {
      v = new Set()
    } else if (typeof value === 'object' && value !== null) {
      v = {}
    } else {
      v = value
    }
    idxs[pointer] = v
  })
  return idxs
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./walk":14}],9:[function(require,module,exports){
'use strict'

var walk = require('./walk')

module.exports = function index (json) {
  var idxs = Object.create(null)
  walk(json, function (value, pointer) {
    idxs[pointer] = value
  })
  return idxs
}

},{"./walk":14}],10:[function(require,module,exports){
'use strict'

var decode = require('./decode');
var encode = require('./encode');

/**
 * Joins pointers
 *
 * @param  {Array}  pointer    - base pointer
 * @param  {Array}  tokens     - array of tokens
 * @param  {String} separator  - separator to use, defaults to /
 * @return {String}            - JSON Pointer string
 */
module.exports = function join(pointer, tokens, separator) {
  if (typeof pointer === 'string') pointer = decode(pointer, separator);
  if (typeof tokens === 'string') tokens = [tokens];
  return encode(pointer.concat(tokens), separator);
}

},{"./decode":3,"./encode":5}],11:[function(require,module,exports){
'use strict'

/**
 * Unescape a JSON Pointer token
 *
 * @param  {String} token      - escaped token
 * @param  {String} separator  - separator to use, defaults to /
 * @return {String}            - unescaped token
 */
module.exports = function unescape (token, separator) {
  var sep = typeof separator === 'string' && separator.length > 0 ? separator : '/'
  return token.replace(/~0/g, '~').replace(/~1/g, sep)
}

},{}],12:[function(require,module,exports){
'use strict'

var decode = require('./decode')
var context = require('./context')

module.exports = function unflatten (indexes) {
  var keys = Object.keys(indexes)
  var json = indexes['']
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i]
    if (key === '') continue
    var idx = decode(key)
    var res = context(json, idx)
    var target = res[1]
    var token = res[0]
    if (typeof Map !== 'undefined' && target instanceof Map) {
      target.set(token, indexes[key])
    } else if (typeof Set !== 'undefined' && target instanceof Set) {
      target.add(indexes[key])
    } else if (Array.isArray(target)) {
      target.push(indexes[key])
    } else {
      target[token] = indexes[key]
    }
  }
  return json
}

},{"./context":2,"./decode":3}],13:[function(require,module,exports){
'use strict'

/**
 * Check if the token is a valid array token and throws an error
 *
 * @param  {String} token        - token
 * @param  {Number} arrayLength  - array length
 * @return {undefined}
 */
module.exports = function validArrayToken(token, arrayLength) {
  if (token === '-') return

  var error = new Error('Invalid pointer')
  var length = token.length

  if (length > 1 && token[0] === '0')
    throw error

  var idx = +token

  if (isNaN(idx))
    throw error

  if (Math.abs(idx).toString() !== token)
    throw error

  if (idx < 0)
    throw error

  if (idx > arrayLength)
    throw error
}

},{}],14:[function(require,module,exports){
'use strict'

var _walk = require('@fuba/walk')
var join = require('./join')

module.exports = function walk (json, fn) {
  var dic = Object.create(null)

  function get(obj) {
    for (var p in dic) {
      if (dic[p] === obj) return p
    }
  }

  function set(obj, key, parent) {
    var path = join(parent ? get(parent) : parent , key)
    dic[path] = obj
  }

  _walk(json, function (v, k, p) {
    if (v !== null && typeof v === 'object') {
      if (p === undefined || k === undefined) set(v, [], '')
      else set(v, k.toString(), p)
    }

    if (k === undefined || p === undefined) {
      fn(v, '')
    } else {
      var parent = get(p)
      fn(v, join(parent, k.toString()), p, parent)
    }
  })
}

},{"./join":10,"@fuba/walk":16}],15:[function(require,module,exports){
(function (global){
'use strict'

module.exports = function each (obj, iterator) {
  if (global.Set && obj instanceof Set) {
    var c = 0
    obj.forEach(function(value) {
      iterator(value, c += 1)
    })
  } else if (Array.isArray(obj) || (global.Map && obj instanceof Map)) {
    obj.forEach(iterator)
  } else if (typeof obj === 'object' && obj !== null) {
    Object.keys(obj).forEach(function(key) {
      iterator(obj[key], key)
    })
  } else {
    throw new TypeError(obj + 'is not a structure')
  }
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],16:[function(require,module,exports){
'use strict'

var each = require('@fuba/each')

function _walk (value, key, parent, fn) {
  fn(value, key, parent)
  if (value === null || typeof value !== 'object') return

  each(value, function (v, k) {
    _walk(v, k, value, fn)
  })
}

module.exports = function walk(obj, iterator) {
  _walk(obj, undefined, undefined, iterator)
}

},{"@fuba/each":15}]},{},[1])(1)
});