import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TableCellQuantity } from './table-cell-quantity';

describe('TableCellQuantity', () => {
  let component: TableCellQuantity;
  let fixture: ComponentFixture<TableCellQuantity>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableCellQuantity],
    }).compileComponents();

    fixture = TestBed.createComponent(TableCellQuantity);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('value', 3);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
