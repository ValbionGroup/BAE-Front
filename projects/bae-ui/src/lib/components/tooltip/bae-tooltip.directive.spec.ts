import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { BfdTooltip } from './bae-tooltip.directive';

@Component({
  imports: [BfdTooltip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<button baeTooltip="Tooltip text">Trigger</button>`,
})
class HostComponent {}

describe(BfdTooltip.name, () => {
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
