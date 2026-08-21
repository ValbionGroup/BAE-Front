import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export interface LegalFact {
  readonly label: string;
  readonly value: string;
  readonly mono?: boolean;
  readonly mailto?: boolean;
}

@Component({
  selector: 'bfp-legal-facts',
  templateUrl: './legal-facts.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LegalFacts {
  readonly rows = input.required<readonly LegalFact[]>();
}
