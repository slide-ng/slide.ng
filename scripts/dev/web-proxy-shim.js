(() => {
  const { key, port, deck } = __SLIDE_NG_WEB__;
  const suffix = `.${key}.localhost`;
  const parentWindow = window.parent !== window ? window.parent : null;

  const isProxied = (u) => u.hostname.endsWith(suffix);
  const toProxy = (url) => {
    try {
      const u = new URL(url, location.href);
      if ((u.protocol !== 'http:' && u.protocol !== 'https:') || isProxied(u)) return u.href;
      const label = u.port ? `${u.protocol.slice(0, -1)}-${u.port}` : u.protocol.slice(0, -1);
      return `http://${u.hostname}.${label}${suffix}:${port}${u.pathname}${u.search}${u.hash}`;
    } catch {
      return url;
    }
  };
  const toReal = (url) => {
    try {
      const u = new URL(url, location.href);
      if (!isProxied(u)) return u.href;
      const name = u.hostname.slice(0, -suffix.length);
      const dot = name.lastIndexOf('.');
      const [scheme, realPort] = name.slice(dot + 1).split('-');
      const host = name.slice(0, dot);
      return `${scheme}://${host}${realPort ? `:${realPort}` : ''}${u.pathname}${u.search}${u.hash}`;
    } catch {
      return url;
    }
  };

  const tell = (message) => {
    if (!parentWindow) return;
    for (const origin of deck) parentWindow.postMessage({ slideNgWeb: message }, origin);
  };
  const report = () =>
    tell({
      type: 'state',
      url: toReal(location.href),
      title: document.title,
      icon: toReal(
        document.querySelector('link[rel~="icon"]')?.href ??
          new URL('/favicon.ico', location.href).href,
      ),
    });

  const realFetch = window.fetch;
  window.fetch = function (input, init) {
    if (typeof input === 'string' || input instanceof URL)
      return realFetch.call(this, toProxy(String(input)), init);
    if (input instanceof Request && !isProxied(new URL(input.url)))
      return realFetch.call(this, new Request(toProxy(input.url), input), init);
    return realFetch.call(this, input, init);
  };
  const realOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    return realOpen.call(this, method, toProxy(String(url)), ...rest);
  };
  if (window.EventSource) {
    const RealEventSource = window.EventSource;
    window.EventSource = function (url, options) {
      return new RealEventSource(toProxy(String(url)), options);
    };
    window.EventSource.prototype = RealEventSource.prototype;
  }
  if (navigator.serviceWorker)
    navigator.serviceWorker.register = () =>
      Promise.reject(new Error('service workers are off in the slide.ng browser'));

  window.open = (url) => {
    if (url) tell({ type: 'open', url: toReal(new URL(String(url), location.href).href) });
    return null;
  };

  document.addEventListener(
    'click',
    (e) => {
      const link = e.target instanceof Element ? e.target.closest('a[href]') : null;
      if (!link || e.defaultPrevented) return;
      const href = link.getAttribute('href') ?? '';
      if (!/^(https?:)?\/\//i.test(href) && link.target !== '_blank') return;
      const target = new URL(href, location.href);
      if (target.protocol !== 'http:' && target.protocol !== 'https:') return;
      if (link.target === '_blank' || e.metaKey || e.ctrlKey || e.shiftKey) {
        e.preventDefault();
        tell({ type: 'open', url: toReal(target.href) });
        return;
      }
      if (!isProxied(target)) link.href = toProxy(target.href);
    },
    true,
  );
  document.addEventListener(
    'submit',
    (e) => {
      const form = e.target;
      if (form instanceof HTMLFormElement && form.action) form.action = toProxy(form.action);
    },
    true,
  );

  if (window.navigation) {
    navigation.addEventListener('navigate', (e) => {
      const target = new URL(e.destination.url);
      if (isProxied(target) || !/^https?:$/.test(target.protocol) || !e.cancelable) return;
      e.preventDefault();
      location.assign(toProxy(target.href));
    });
    navigation.addEventListener('navigatesuccess', report);
  }
  addEventListener('popstate', report);
  addEventListener('hashchange', report);
  addEventListener('DOMContentLoaded', () => {
    report();
    const title = document.querySelector('title');
    if (title)
      new MutationObserver(report).observe(title, {
        childList: true,
        characterData: true,
        subtree: true,
      });
  });
  addEventListener('load', report);
  for (const name of ['pushState', 'replaceState']) {
    const real = history[name];
    history[name] = function (...args) {
      const out = real.apply(this, args);
      report();
      return out;
    };
  }

  addEventListener('message', (e) => {
    if (e.source !== parentWindow || !deck.includes(e.origin)) return;
    const command = e.data?.slideNgWeb;
    if (command?.type === 'go' && typeof command.url === 'string')
      location.replace(toProxy(command.url));
    else if (command?.type === 'reload') location.reload();
    else if (command?.type === 'state') report();
  });
  report();
})();
