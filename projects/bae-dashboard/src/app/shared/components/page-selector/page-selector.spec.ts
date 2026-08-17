import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PageSelector } from './page-selector';

describe(PageSelector.name, () => {
  let component: PageSelector;
  let fixture: ComponentFixture<PageSelector>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PageSelector],
    }).compileComponents();

    fixture = TestBed.createComponent(PageSelector);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
