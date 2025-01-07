
/**
 * @param {number} ms to format
 * @return {string}
 */
export function formatDuration(ms) {
  let prefix = '';
  if (ms < 0) {
    prefix = '-';
    ms = -ms;
  }

  const sec = ~~(ms / 1000);
  const min = ~~(sec / 60);
  const hours = ~~(min / 60);
  const days = ~~(hours / 24);

  let out = `${~~(sec - min*60)}s`;
  if (min === 0) {
    return prefix + out;
  }

  out = `${~~(min - hours*60)}m` + out;
  if (hours === 0) {
    return prefix + out;
  }

  out = `${~~(hours - days*24)}h` + out;
  if (days === 0) {
    return prefix + out;
  }

  return `${prefix}${~~days}d${out}`;
}
