import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { FloatingDirective } from './floating.directive';

@Component({
  imports: [FloatingDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button #trigger>Trigger</button>
    <div [baeFloating]="trigger">Floating</div>
  `,
})
class HostComponent {}

describe(FloatingDirective.name, () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create the host with the directive', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
