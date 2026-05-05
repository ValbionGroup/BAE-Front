import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TableCellPill } from './table-cell-pill';

describe('TableCellPill', () => {
  let component: TableCellPill;
  let fixture: ComponentFixture<TableCellPill>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableCellPill],
    }).compileComponents();

    fixture = TestBed.createComponent(TableCellPill);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
