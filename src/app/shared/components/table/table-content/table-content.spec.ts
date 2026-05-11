import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TableContent } from './table-content';

describe('TableContent', () => {
  let component: TableContent;
  let fixture: ComponentFixture<TableContent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableContent],
    }).compileComponents();

    fixture = TestBed.createComponent(TableContent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
