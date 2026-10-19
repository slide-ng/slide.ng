// What `slide-ng build` tells the generator, through environment variables (the generator is a separate process).
//   SLIDE_NG_BUILD=1          this is a production build (remote assets are downloaded)
//   SLIDE_NG_BASE=/talk/      the path the deck is served under
//   SLIDE_NG_DOWNLOAD=1       --download: the nav bar offers the PDF even if the headmatter does not say so
//   SLIDE_NG_WITHOUT_NOTES=1  --without-notes: speaker notes are left out of the build
//   SLIDE_NG_OFFLINE=1        --offline: a folder that opens from disk (base ./, hash routing, no service worker)
//   SLIDE_NG_DEV=1            set by `slide-ng dev`: the generator works for the dev server (a `dev` switch is on)
export function buildOptions(env = process.env) {
  return {
    building: env.SLIDE_NG_BUILD === '1',
    offline: env.SLIDE_NG_OFFLINE === '1',
    base: env.SLIDE_NG_BASE || '/',
    download: env.SLIDE_NG_DOWNLOAD === '1',
    withoutNotes: env.SLIDE_NG_WITHOUT_NOTES === '1',
    dev: env.SLIDE_NG_DEV === '1',
  };
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

/**
 * A headmatter switch that may name a mode (`monaco`, `twoslash`): `true`, `false`, `dev` or `build`; not set means on.
 * The same rule as the app's `readSwitch` (src/app/lib/switches.ts): anything but `slide-ng dev` (a build, an export) is `build`.
 */
export function modeSwitch(value, dev) {
  if (value === true || value === false) return value;
  if (value === 'dev') return dev;
  if (value === 'build') return !dev;
  return true;
}
