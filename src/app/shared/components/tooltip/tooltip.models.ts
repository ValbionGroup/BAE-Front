import type { Placement } from '@floating-ui/dom';

export interface TooltipConfig {
  readonly anchor: HTMLElement;
  readonly title: string;
  readonly description?: string;
  readonly placement?: Placement;
}

export interface OpenTooltip extends TooltipConfig {
  readonly id: string;
}
