export const is = {
  obj: (a) => a === Object(a) && !is.arr(a) && typeof a !== 'function',
  fun: (a) => typeof a === 'function',
  str: (a) => typeof a === 'string',
  num: (a) => typeof a === 'number',
  und: (a) => a === void 0,
  arr: (a) => Array.isArray(a),
  equ(a, b) {
    // Wrong type or one of the two undefined, doesn't match
    if (typeof a !== typeof b || !!a !== !!b) return false
    // Atomic, just compare a against b
    if (is.str(a) || is.num(a) || is.obj(a)) return a === b
    // Array, shallow compare first to see if it's a match
    if (is.arr(a) && a == b) return true
    // Last resort, go through keys
    let i
    for (i in a) if (!(i in b)) return false
    for (i in b) if (a[i] !== b[i]) return false
    return is.und(i) ? a === b : true
  },
  dequ(a, b, checkLength = false) {
    // Deep object comparison
    if (is.equ(a, b)) return true
    else if (is.obj(a) && is.obj(b)) {
      if (checkLength && Object.keys(a).length != Object.keys(b).length)
        return false
      for (var prop in a) {
        if (b.hasOwnProperty(prop)) {
          if (!is.dequ(a[prop], b[prop])) return false
        } else return false
      }
      return true
    } else return false
  }
}

export const deepWrite = (source, target) => {
  // writes
}

export const obj = {
  // Adds defaults b to a if a is missing them, returns same reference as a.
  default: (a, b) => Object.assign(a, Object.assign(b, a))
}

export const arr = {
  remove: (arr, obj) => {
    var index = arr.indexOf(obj);
    if (index !== -1) arr.splice(index, 1)
  },
  removeByIndex: (arr, id) => {
    arr.splice(id, 1)
  },
  init2D: (r, c, value = 0) => {
    return Array(r).fill().map(() => Array(c).fill(value))
  }
}

export const jiggle = () => Math.random()*1e-6