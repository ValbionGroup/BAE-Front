import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TableCellNumber } from './table-cell-number';

describe('TableCellNumber', () => {
  let component: TableCellNumber;
  let fixture: ComponentFixture<TableCellNumber>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableCellNumber],
    }).compileComponents();

    fixture = TestBed.createComponent(TableCellNumber);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
