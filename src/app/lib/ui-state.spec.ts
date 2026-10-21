import { TestBed } from '@angular/core/testing';
import { Ui } from './ui-state';

describe('Ui', () => {
  it('moves the overview highlight along the cards on the screen, mirrored in a right-to-left page', () => {
    TestBed.configureTestingModule({ providers: [Ui] });
    const ui = TestBed.inject(Ui);
    ui.overviewColumns.set(3);
    ui.overviewPage.set(5);
    ui.moveOverview('right', 9, false);
    expect(ui.overviewPage()).toBe(6);
    ui.moveOverview('right', 9, true);
    expect(ui.overviewPage()).toBe(5);
    ui.moveOverview('left', 9, true);
    expect(ui.overviewPage()).toBe(6);
    ui.moveOverview('up', 9, true);
    expect(ui.overviewPage()).toBe(3);
    ui.moveOverview('down', 9, false);
    ui.moveOverview('down', 9, false);
    expect(ui.overviewPage()).toBe(9);
  });
});
