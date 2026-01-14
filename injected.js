// Injected script to capture auth token from network requests
// This runs in the page context (not extension context)

(function() {
  if (window._kookExportInterceptorInstalled) return;
  window._kookExportInterceptorInstalled = true;

  // Intercept fetch
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const [url, options] = args;
    if (options && options.headers) {
      let headers = options.headers;
      if (headers instanceof Headers) {
        const auth = headers.get('Authorization');
        if (auth) saveToken(auth);
      } else if (typeof headers === 'object') {
        const auth = headers['Authorization'] || headers['authorization'];
        if (auth) saveToken(auth);
      }
    }
    return originalFetch.apply(this, args);
  };

  // Intercept XMLHttpRequest
  const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
  XMLHttpRequest.prototype.setRequestHeader = function(name, value) {
    if (name.toLowerCase() === 'authorization') {
      saveToken(value);
    }
    return originalSetRequestHeader.apply(this, arguments);
  };

  function saveToken(auth) {
    if (auth && (auth.includes('Bearer') || auth.length > 30)) {
      const token = auth.replace(/^Bearer\s+/i, '');
      sessionStorage.setItem('_kook_export_token', token);
      console.log('[Kook Export] Token captured!');
    }
  }

  console.log('[Kook Export] Interceptor installed');
})();
