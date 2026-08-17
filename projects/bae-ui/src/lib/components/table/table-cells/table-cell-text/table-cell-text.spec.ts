import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TableCellText } from './table-cell-text';

describe('TableCellText', () => {
  let component: TableCellText;
  let fixture: ComponentFixture<TableCellText>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableCellText],
    }).compileComponents();

    fixture = TestBed.createComponent(TableCellText);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('value', 'Texte');
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
