import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';
import { Deck } from './deck';
import { DevApi } from './dev/dev-api';
import { presenterEnabled } from './lib/switches';
import { NotesPage } from './presenter/notes-page';
import { NotesPrint } from './print/notes-print';
import { PrintPage } from './print/print-page';
import { Presenter } from './presenter/presenter';

// Slidev exports by opening /3?print=true; the same query on a slide address goes to /print.
const printQuery: CanActivateFn = (route) => {
  const print = route.queryParamMap.get('print');
  if (!print || print === 'false') return true;
  return inject(Router).createUrlTree(['/print'], { queryParams: route.queryParams });
};

// Headmatter `presenter: false` (or `dev` / `build` in the other mode) has no presenter page: the address goes to slide 1.
// With `dev --remote`, someone without the password gets the slides, not the notes (like Slidev's router).
const unlocked: CanActivateFn = async (_route, state) => {
  const api = inject(DevApi);
  const router = inject(Router); // before the await: inject() only works synchronously
  await api.token(); // asks for the password once when the server wants one
  if (api.locked()) return router.createUrlTree(['/1']);
  // The router would write `?password=` back into the address bar at the end of this navigation: go there without it.
  const url = router.parseUrl(state.url);
  if (!('password' in url.queryParams)) return true;
  delete url.queryParams['password'];
  return url;
};
const presenterAllowed: CanActivateFn = () =>
  presenterEnabled() || inject(Router).createUrlTree(['/1']);

// /3 shows slide 3, /print every slide for export, /presenter/3 the presenter page, /notes the notes only. Anything else goes to slide 1.
// `data.mode` tells Nav which of the two navigations it is serving.
export const routes: Routes = [
  { path: 'presenter', pathMatch: 'full', redirectTo: 'presenter/1' },
  { path: 'presenter/print', component: NotesPrint, canActivate: [unlocked] },
  {
    path: 'presenter/:no',
    component: Presenter,
    data: { mode: 'presenter' },
    canActivate: [presenterAllowed, unlocked],
  },
  { path: 'notes', component: NotesPage, canActivate: [unlocked] },
  { path: 'print', component: PrintPage },
  { path: ':no', component: Deck, canActivate: [printQuery] },
  { path: '**', redirectTo: '1' },
];
