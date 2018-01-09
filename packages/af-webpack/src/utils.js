export function stripLastSlash(str) {
  return str.slice(-1) === '/' ? str.slice(0, -1) : str;
}

export function runArray(stats, fn) {
  if (stats && Array.isArray(stats)) {
    return stats.map(fn);
  } else {
    return fn(stats);
  }
}
