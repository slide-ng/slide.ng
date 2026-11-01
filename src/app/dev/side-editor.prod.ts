import { Component } from '@angular/core';

// A static build has no side editor (there is no dev server to save to): this stands in for side-editor.ts (angular.json).
@Component({
  selector: 'app-side-editor',
  templateUrl: './side-editor.prod.html',
})
export class SideEditor {}
