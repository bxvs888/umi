import assert from 'assert';
import isPlainObject from 'is-plain-object';

export default function() {
  return {
    name: 'doneCallback',
    validate(val) {
      assert(
        typeof val == 'function',
        `The html config must be Plain Object, but got ${val}`,
      );
    },
  };
}
