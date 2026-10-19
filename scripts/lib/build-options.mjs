// What `slide-ng build` tells the generator, through environment variables (the generator is a separate process).
//   SLIDE_NG_BUILD=1          this is a production build (remote assets are downloaded)
//   SLIDE_NG_BASE=/talk/      the path the deck is served under
//   SLIDE_NG_DOWNLOAD=1       --download: the nav bar offers the PDF even if the headmatter does not say so
//   SLIDE_NG_WITHOUT_NOTES=1  --without-notes: speaker notes are left out of the build
//   SLIDE_NG_OFFLINE=1        --offline: a folder that opens from disk (base ./, hash routing, no service worker)
//   SLIDE_NG_ROUTER_MODE=hash --router-mode: replaces the headmatter's `routerMode` (history, hash or memory)
export function buildOptions(env = process.env) {
  return {
    building: env.SLIDE_NG_BUILD === '1',
    offline: env.SLIDE_NG_OFFLINE === '1',
    base: env.SLIDE_NG_BASE || '/',
    download: env.SLIDE_NG_DOWNLOAD === '1',
    withoutNotes: env.SLIDE_NG_WITHOUT_NOTES === '1',
    routerMode: env.SLIDE_NG_ROUTER_MODE || null,
  };
}

export const ROUTER_MODES = ['history', 'hash', 'memory'];

/** `--router-mode`: one of ROUTER_MODES, or undefined when the flag was not given. */
export function checkRouterMode(mode) {
  if (mode !== undefined && !ROUTER_MODES.includes(mode))
    throw new Error(`--router-mode must be one of ${ROUTER_MODES.join(', ')}, got "${mode}"`);
  return mode;
}

/**
 * The router mode the exporter opens a built deck with. Memory routing does not read the address, except for the print
 * pages the exporter opens (src/app/lib/memory-location.ts), so those are asked for with history addresses, like Slidev.
 */
export function addressMode(headmatter) {
  return headmatter.routerMode === 'hash' ? 'hash' : 'history';
}

/** What an offline folder needs from the headmatter: hash routing (no server to answer `/3`) and no service worker. Changes it in place. */
export function applyOffline(headmatter) {
  headmatter.routerMode = 'hash';
  headmatter.pwa = false;
  return headmatter;
}

/**
 * `remoteAssets` in the headmatter: true (always), `build` or `dev`. Downloading happens only in a build.
 * An offline folder takes the pictures along even when the headmatter does not ask (`remoteAssets: false` still says no).
 */
export function wantsRemoteAssets(headmatter, building, offline = false) {
  const v = headmatter.remoteAssets;
  return building && v !== false && (v === true || v === 'build' || offline);
}
