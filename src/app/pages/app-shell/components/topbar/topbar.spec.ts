import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Topbar } from './topbar';
import { PageHeaderService } from '#core/services/page-header/page-header-service';

describe('Topbar', () => {
  let fixture: ComponentFixture<Topbar>;
  let pageHeader: PageHeaderService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Topbar],
    }).compileComponents();

    fixture = TestBed.createComponent(Topbar);
    pageHeader = TestBed.inject(PageHeaderService);
  });

  it('renders the title and breadcrumb from PageHeaderService', async () => {
    pageHeader.set({ title: 'Test', breadcrumb: ['A', 'B'] });
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    const h1 = host.querySelector('h1');
    expect(h1).toBeTruthy();
    expect(h1?.textContent?.trim()).toBe('Test');

    const nav = host.querySelector('nav[aria-label="Fil d\'Ariane"]');
    expect(nav).toBeTruthy();
    expect(nav?.textContent).toContain('A');
    expect(nav?.textContent).toContain('B');
  });
});
