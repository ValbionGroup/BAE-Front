import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ColumnType, Table } from './table';

describe('Table', () => {
  let component: Table<object>;
  let fixture: ComponentFixture<Table<object>>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Table],
    }).compileComponents();

    fixture = TestBed.createComponent(Table);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('name', 'Test table');
    fixture.componentRef.setInput('columns', [
      { key: 'name', label: 'Nom', type: ColumnType.TEXT },
    ]);
    fixture.componentRef.setInput('rows', [{ name: 'Ligne' }]);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
