import {
  Component,
  Directive,
  input,
  computed,
  ViewEncapsulation,
  ChangeDetectionStrategy,
  TemplateRef,
} from '@angular/core'
import {
  CdkMenuModule,
  CdkMenuItem,
  CdkMenuTrigger,
  CdkMenuItemCheckbox,
  CdkMenuItemRadio,
  CdkMenuGroup,
} from '@angular/cdk/menu'
import { NgIconComponent } from '@ng-icons/core'
import { cn } from '../../lib/utils'

@Directive({
  selector: '[appDropdownMenu]',
  standalone: true,
  hostDirectives: [
    {
      directive: CdkMenuTrigger,
      inputs: ['cdkMenuTriggerFor: appDropdownMenu'],
    },
  ],
  host: {
    type: 'button',
  },
})
export class DropdownMenu {
  appDropdownMenu = input.required<TemplateRef<any>>()
}

@Component({
  selector: 'app-dropdown-menu-content',
  standalone: true,
  imports: [CdkMenuModule],
  template: `
    <div [class]="computedClasses()" cdkMenu cdkMenuGroup>
      <ng-content />
    </div>
  `,
  host: {
    '[attr.data-slot]': '"dropdown-menu-content"',
  },
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DropdownMenuContent {
  className = input<string>('', { alias: 'class' })

  computedClasses = computed(() =>
    cn(
      'bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-[8rem] overflow-x-hidden overflow-y-auto rounded-md border p-1 shadow-md',
      this.className(),
    ),
  )
}

@Component({
  selector: 'button[appDropdownMenuItem], a[appDropdownMenuItem]',
  standalone: true,
  hostDirectives: [
    {
      directive: CdkMenuItem,
      outputs: ['cdkMenuItemTriggered: triggered'],
    },
  ],
  host: {
    '[attr.data-slot]': '"dropdown-menu-item"',
    '[attr.data-inset]': 'inset()',
    '[attr.data-variant]': 'variant()',
    '[class]': 'computedClasses()',
  },
  template: `<ng-content />`,
})
export class DropdownMenuItem {
  appDropdownMenuItem = input<any>(null)
  className = input<string>('', { alias: 'class' })
  inset = input<boolean>(false)
  variant = input<'default' | 'destructive'>('default')

  computedClasses = computed(() =>
    cn(
      "focus:bg-accent focus:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:focus:text-destructive data-[variant=destructive]:*:[svg]:!text-destructive [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
      this.className(),
    ),
  )
}

@Component({
  selector: 'button[appDropdownMenuCheckboxItem]',
  standalone: true,
  imports: [CdkMenuModule, NgIconComponent],
  hostDirectives: [
    {
      directive: CdkMenuItemCheckbox,
      inputs: ['cdkMenuItemChecked: checked', 'cdkMenuItemDisabled: disabled'],
      outputs: ['cdkMenuItemTriggered: triggered'],
    },
  ],
  host: {
    '[attr.data-slot]': '"dropdown-menu-checkbox-item"',
    '[class]': 'computedClasses()',
  },
  template: `
    <span class="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
      @if (checked()) {
        <ng-icon name="lucideCheck" class="size-4" />
      }
    </span>
    <ng-content />
  `,
})
export class DropdownMenuCheckboxItem {
  className = input<string>('', { alias: 'class' })
  checked = input<boolean>(false)

  computedClasses = computed(() =>
    cn(
      "focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
      this.className(),
    ),
  )
}

@Component({
  selector: 'app-dropdown-menu-separator',
  standalone: true,
  host: {
    '[attr.data-slot]': '"dropdown-menu-separator"',
    '[class]': 'cn("bg-border -mx-1 my-1 h-px", className())',
  },
  template: ``,
})
export class DropdownMenuSeparator {
  className = input<string>('', { alias: 'class' })
  protected cn = cn
}

@Component({
  selector: 'button[appDropdownMenuSubTrigger]',
  standalone: true,
  imports: [NgIconComponent],
  host: {
    '[attr.data-slot]': '"dropdown-menu-sub-trigger"',
    '[attr.data-inset]': 'inset()',
    '[class]': 'computedClasses()',
  },
  template: `
    <ng-content />
    <ng-icon name="lucideChevronRight" class="ml-auto size-4" />
  `,
})
export class DropdownMenuSubTrigger {
  className = input<string>('', { alias: 'class' })
  inset = input<boolean>(false)

  computedClasses = computed(() =>
    cn(
      'focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-none select-none data-[inset]:pl-8',
      this.className(),
    ),
  )
}
@Component({
  selector: 'app-dropdown-menu-radio-group',
  standalone: true,
  hostDirectives: [CdkMenuGroup],
  host: {
    '[attr.data-slot]': '"dropdown-menu-radio-group"',
  },
  template: `<ng-content />`,
})
export class DropdownMenuRadioGroup {}

@Component({
  selector: 'button[appDropdownMenuRadioItem]',
  standalone: true,
  imports: [CdkMenuModule, NgIconComponent],
  hostDirectives: [
    {
      directive: CdkMenuItemRadio,
      inputs: ['cdkMenuItemChecked: checked', 'cdkMenuItemDisabled: disabled'],
      outputs: ['cdkMenuItemTriggered: triggered'],
    },
  ],
  host: {
    '[attr.data-slot]': '"dropdown-menu-radio-item"',
    '[class]': 'computedClasses()',
  },
  template: `
    <span class="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
      @if (checked()) {
        <ng-icon name="lucideCircle" class="size-2 fill-current" />
      }
    </span>
    <ng-content />
  `,
})
export class DropdownMenuRadioItem {
  className = input<string>('', { alias: 'class' })
  checked = input<boolean>(false)

  computedClasses = computed(() =>
    cn(
      "focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
      this.className(),
    ),
  )
}

@Component({
  selector: 'app-dropdown-menu-label',
  standalone: true,
  host: {
    '[attr.data-slot]': '"dropdown-menu-label"',
    '[attr.data-inset]': 'inset()',
    '[class]': 'computedClasses()',
  },
  template: `<ng-content />`,
})
export class DropdownMenuLabel {
  className = input<string>('', { alias: 'class' })
  inset = input<boolean>(false)

  computedClasses = computed(() =>
    cn('px-2 py-1.5 text-sm font-medium data-[inset]:pl-8', this.className()),
  )
}

@Component({
  selector: 'span[appDropdownMenuShortcut]',
  standalone: true,
  host: {
    '[attr.data-slot]': '"dropdown-menu-shortcut"',
    '[class]': 'computedClasses()',
  },
  template: `<ng-content />`,
})
export class DropdownMenuShortcut {
  className = input<string>('', { alias: 'class' })

  computedClasses = computed(() =>
    cn('text-muted-foreground ml-auto text-xs tracking-widest', this.className()),
  )
}

@Component({
  selector: 'app-dropdown-menu-sub-content',
  standalone: true,
  imports: [CdkMenuModule],
  template: `
    <div [class]="computedClasses()" cdkMenu cdkMenuGroup>
      <ng-content />
    </div>
  `,
  host: {
    '[attr.data-slot]': '"dropdown-menu-sub-content"',
  },
})
export class DropdownMenuSubContent {
  className = input<string>('', { alias: 'class' })

  computedClasses = computed(() =>
    cn(
      'bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-[8rem] origin-(--radix-dropdown-menu-content-transform-origin) overflow-hidden rounded-md border p-1 shadow-lg',
      this.className(),
    ),
  )
}

// usage
// <ng-template #mainMenu>
//   <app-dropdown-menu-content class="w-56">
//     <button appDropdownMenuCheckboxItem [checked]="showStatusBar()">
//       Show Status Bar
//     </button>

//     <app-dropdown-menu-separator />

//     <button appDropdownMenuSubTrigger [cdkMenuTriggerFor]="sub">
//       More Tools
//     </button>

//     <ng-template #sub>
//       <app-dropdown-menu-content>
//         <button appDropdownMenuItem>Save Page As...</button>
//         <button appDropdownMenuItem>Create Shortcut...</button>
//       </app-dropdown-menu-content>
//     </ng-template>

//     <app-dropdown-menu-separator />

//     <div cdkMenuGroup>
//       <app-dropdown-menu-label>Theme</app-dropdown-menu-label>
//       <button appDropdownMenuRadioItem [checked]="theme() === 'light'">Light</button>
//       <button appDropdownMenuRadioItem [checked]="theme() === 'dark'">Dark</button>
//     </div>
//   </app-dropdown-menu-content>
// </ng-template>
