import { APP_BASE_HREF, Location, LocationStrategy } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import {
  MEMORY_KEEP,
  MemoryLocationStrategy,
  memorySlideHref,
  memoryStart,
} from './memory-location';

describe('memoryStart', () => {
  it('starts every address but the print pages at slide 1', () => {
    expect(memoryStart('7?clicks=2')).toBe('/');
    expect(memoryStart('presenter/3')).toBe('/');
    expect(memoryStart('printer')).toBe('/');
    expect(memoryStart('')).toBe('/');
  });
  it("opens the slide of a slide link's href, #/<number>, and only that", () => {
    expect(memoryStart('', '#/4')).toBe('/4');
    expect(memoryStart('', '#/4?clicks=2')).toBe('/4?clicks=2');
    expect(memoryStart('7', '#/4')).toBe('/4');
    expect(memoryStart('', '#/presenter/1')).toBe('/');
    expect(memoryStart('', '#/overview')).toBe('/');
    expect(memoryStart('', '#top')).toBe('/');
    expect(memoryStart('print', '#/4')).toBe('/print');
    expect(memorySlideHref('/talk/', 4)).toBe('/talk/#/4');
  });
  it('keeps the print pages the exporter opens', () => {
    expect(memoryStart('print?range=1-3')).toBe('/print?range=1-3');
    expect(memoryStart('/presenter/print')).toBe('/presenter/print');
  });
});

describe('MemoryLocationStrategy', () => {
  let location: Location;
  let before: string;
  beforeEach(() => {
    before = window.location.href;
    TestBed.configureTestingModule({
      providers: [
        { provide: APP_BASE_HREF, useValue: '/talk/' },
        { provide: LocationStrategy, useClass: MemoryLocationStrategy },
        { provide: MEMORY_KEEP, useValue: false },
      ],
    });
    location = TestBed.inject(Location);
  });

  it('moves without touching the address bar', () => {
    expect(location.path()).toBe('');
    location.go('/3', 'clicks=1');
    expect(location.path()).toBe('/3?clicks=1');
    location.replaceState('/3', 'clicks=2');
    expect(location.path()).toBe('/3?clicks=2');
    expect(window.location.href).toBe(before);
  });

  it('goes back and forward through its own entries', () => {
    const seen: string[] = [];
    location.subscribe((e) => seen.push(e.url ?? ''));
    location.go('/2');
    location.go('/3');
    location.back();
    expect(location.path()).toBe('/2');
    location.forward();
    expect(location.path()).toBe('/3');
    location.forward(); // nothing after the last entry
    expect(seen).toEqual(['/2', '/3']);
  });

  it('writes links under the base', () => {
    expect(location.prepareExternalUrl('/4')).toBe('/talk/4');
  });
});

describe('MemoryLocationStrategy in the dev server', () => {
  const start = () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: LocationStrategy, useClass: MemoryLocationStrategy },
        { provide: MEMORY_KEEP, useValue: true },
      ],
    });
    return TestBed.inject(LocationStrategy);
  };
  beforeEach(() => sessionStorage.removeItem('slide-ng-memory-location'));
  afterEach(() => sessionStorage.removeItem('slide-ng-memory-location'));

  it('stays on the same slide after a reload (each save reloads the page)', () => {
    start().pushState(null, '', '/4', 'clicks=1');
    expect(start().path()).toBe('/4?clicks=1');
  });
  it('starts at slide 1 when nothing was kept', () => {
    expect(start().path()).toBe('/');
  });
});
