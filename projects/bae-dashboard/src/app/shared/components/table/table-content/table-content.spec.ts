import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TableContent } from './table-content';
import { ColumnType } from '../table';

describe('TableContent', () => {
  let component: TableContent<object>;
  let fixture: ComponentFixture<TableContent<object>>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableContent],
    }).compileComponents();

    fixture = TestBed.createComponent(TableContent);
    component = fixture.componentInstance;
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
