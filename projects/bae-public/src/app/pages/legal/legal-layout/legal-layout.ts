import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Badge } from '@bae/ui';

export interface LegalTocEntry {
  readonly id: string;
  readonly label: string;
  readonly children?: readonly LegalTocEntry[];
}

@Component({
  selector: 'bfp-legal-layout',
  imports: [Badge, RouterLink],
  templateUrl: './legal-layout.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LegalLayout {
  readonly badge = input.required<string>();
  readonly heading = input.required<string>();
  readonly intro = input.required<string>();
  readonly updatedAt = input.required<string>();
  readonly toc = input.required<readonly LegalTocEntry[]>();
}
