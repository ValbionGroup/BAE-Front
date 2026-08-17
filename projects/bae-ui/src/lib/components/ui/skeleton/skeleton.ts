import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type SkeletonRadius = 'sm' | 'md' | 'pill';
export type SkeletonVariant = 'border' | 'surface-3';

/**
 * Single skeleton block. Use multiple stacked or grid-arranged instances to
 * build loading placeholders (see screen-components.jsx · SKELETONS).
 *
 *   <bae-skeleton width="80px" height="10px" />
 *   <bae-skeleton width="60%" height="22px" variant="surface-3" />
 */
@Component({
  selector: 'bae-skeleton',
  template: `
    <span
      class="block animate-pulse"
      [class]="bgClass()"
      [style.width]="widthCss()"
      [style.height]="heightCss()"
      [style.borderRadius]="radiusCss()"
    ></span>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Skeleton {
  readonly width = input<string | number>('100%');
  readonly height = input<string | number>(8);
  readonly rounded = input<SkeletonRadius>('sm');
  readonly variant = input<SkeletonVariant>('border');

  protected readonly widthCss = computed(() => this.toCss(this.width()));
  protected readonly heightCss = computed(() => this.toCss(this.height()));
  protected readonly radiusCss = computed(() => {
    const r = this.rounded();
    return r === 'pill' ? '999px' : r === 'md' ? '6px' : '4px';
  });
  protected readonly bgClass = computed(() =>
    this.variant() === 'surface-3' ? 'bg-surface-3' : 'bg-border',
  );

  private toCss(v: string | number): string {
    return typeof v === 'number' ? `${v}px` : v;
  }
}
