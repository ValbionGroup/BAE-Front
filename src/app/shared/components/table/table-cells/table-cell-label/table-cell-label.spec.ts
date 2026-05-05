import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TableCellLabel } from './table-cell-label';

describe('TableCellLabel', () => {
  let component: TableCellLabel;
  let fixture: ComponentFixture<TableCellLabel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableCellLabel],
    }).compileComponents();

    fixture = TestBed.createComponent(TableCellLabel);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
