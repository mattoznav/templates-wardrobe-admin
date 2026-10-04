import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

// Phosphor icons (regular), bundled as text by the ".svg" loader in angular.json
import archive from '@phosphor-icons/core/assets/regular/archive.svg';
import arrowLeft from '@phosphor-icons/core/assets/regular/arrow-left.svg';
import arrowSquareOut from '@phosphor-icons/core/assets/regular/arrow-square-out.svg';
import arrowUUpLeft from '@phosphor-icons/core/assets/regular/arrow-u-up-left.svg';
import caretLeft from '@phosphor-icons/core/assets/regular/caret-left.svg';
import caretRight from '@phosphor-icons/core/assets/regular/caret-right.svg';
import chartBar from '@phosphor-icons/core/assets/regular/chart-bar.svg';
import check from '@phosphor-icons/core/assets/regular/check.svg';
import checkCircle from '@phosphor-icons/core/assets/regular/check-circle.svg';
import coatHanger from '@phosphor-icons/core/assets/regular/coat-hanger.svg';
import image from '@phosphor-icons/core/assets/regular/image.svg';
import magnifyingGlass from '@phosphor-icons/core/assets/regular/magnifying-glass.svg';
import minus from '@phosphor-icons/core/assets/regular/minus.svg';
import packageIcon from '@phosphor-icons/core/assets/regular/package.svg';
import pencilSimple from '@phosphor-icons/core/assets/regular/pencil-simple.svg';
import plus from '@phosphor-icons/core/assets/regular/plus.svg';
import receipt from '@phosphor-icons/core/assets/regular/receipt.svg';
import signOut from '@phosphor-icons/core/assets/regular/sign-out.svg';
import stack from '@phosphor-icons/core/assets/regular/stack.svg';
import storefront from '@phosphor-icons/core/assets/regular/storefront.svg';
import tag from '@phosphor-icons/core/assets/regular/tag.svg';
import trash from '@phosphor-icons/core/assets/regular/trash.svg';
import truck from '@phosphor-icons/core/assets/regular/truck.svg';
import warningCircle from '@phosphor-icons/core/assets/regular/warning-circle.svg';
import x from '@phosphor-icons/core/assets/regular/x.svg';

const ICONS = {
  archive,
  'arrow-left': arrowLeft,
  'arrow-square-out': arrowSquareOut,
  'arrow-u-up-left': arrowUUpLeft,
  'caret-left': caretLeft,
  'caret-right': caretRight,
  'chart-bar': chartBar,
  check,
  'check-circle': checkCircle,
  'coat-hanger': coatHanger,
  image,
  'magnifying-glass': magnifyingGlass,
  minus,
  package: packageIcon,
  'pencil-simple': pencilSimple,
  plus,
  receipt,
  'sign-out': signOut,
  stack,
  storefront,
  tag,
  trash,
  truck,
  'warning-circle': warningCircle,
  x,
};

export type IconName = keyof typeof ICONS;

@Component({
  selector: 'app-icon',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'aria-hidden': 'true',
    '[innerHTML]': 'svg()',
    '[style.width.px]': 'size()',
    '[style.height.px]': 'size()',
    style: 'display: inline-grid; flex-shrink: 0',
  },
})
export class Icon {
  private sanitizer = inject(DomSanitizer);
  readonly name = input.required<IconName>();
  readonly size = input(20);
  // The markup is our own bundled file, never user input
  protected svg = computed(() => this.sanitizer.bypassSecurityTrustHtml(ICONS[this.name()].replace('<svg ', '<svg width="100%" height="100%" ')));
}
