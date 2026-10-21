import { Component } from '@angular/core';

// /notes-edit only opens with the dev server (its route is guarded by DevApi.enabled, which is false in a static build), so a
// static build carries this empty page instead of notes-edit-page.ts (angular.json), as it does for the side editor.
@Component({ selector: 'app-notes-edit-page', template: '' })
export class NotesEditPage {}
