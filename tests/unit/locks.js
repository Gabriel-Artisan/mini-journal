// Deterministic exclusive-lock stand-in for Node unit tests; real cross-tab
// Web Locks are exercised by the browser suite.
export function createTestLocks() {
  let queue = Promise.resolve();
  return {
    request(_name, _options, callback) {
      const result = queue.then(callback);
      queue = result.catch(() => {});
      return result;
    },
  };
}
