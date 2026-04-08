import { Routes } from '@angular/router'

export const TESTING_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./test.component').then((m) => m.TestingComponent),
    children: [
      { path: '', redirectTo: 'button', pathMatch: 'full', data: { forceFullScreen: true } },
      {
        path: 'button',
        loadComponent: () => import('./button-test.component').then((m) => m.ButtonTestComponent),
      },
      {
        path: 'select',
        loadComponent: () => import('./select-test.component').then((m) => m.SelectTestComponent),
      },
      {
        path: 'badge',
        loadComponent: () => import('./badge-test.component').then((m) => m.BadgeTestComponent),
      },
      {
        path: 'dropdown',
        loadComponent: () =>
          import('./dropdown-test.component').then((m) => m.DropdownTestComponent),
      },
      {
        path: 'alert',
        loadComponent: () => import('./alert-test.component').then((m) => m.AlertTestComponent),
      },
      {
        path: 'attachment',
        loadComponent: () =>
          import('./attachment-test.component').then((m) => m.AttachmentTestComponent),
      },
      {
        path: 'card',
        loadComponent: () => import('./card-test.component').then((m) => m.CardTestComponent),
      },
      {
        path: 'chat',
        loadComponent: () => import('./chat-test.component').then((m) => m.ChatTestComponent),
      },
      {
        path: 'checkbox',
        loadComponent: () =>
          import('./checkbox-test.component').then((m) => m.CheckboxTestComponent),
      },
      {
        path: 'code',
        loadComponent: () => import('./code-test.component').then((m) => m.CodeTestComponent),
      },
      {
        path: 'dialog',
        loadComponent: () => import('./dialog-test.component').then((m) => m.DialogTestComponent),
      },
      {
        path: 'upload',
        loadComponent: () => import('./upload-test.component').then((m) => m.UploadTestComponent),
      },
      {
        path: 'loading',
        loadComponent: () => import('./loading-test.component').then((m) => m.LoadingTestComponent),
      },
      {
        path: 'markdown',
        loadComponent: () =>
          import('./markdown-test.component').then((m) => m.MarkdownTestComponent),
      },
      {
        path: 'scroll',
        loadComponent: () => import('./scroll-test.component').then((m) => m.ScrollTestComponent),
      },
      {
        path: 'switch',
        loadComponent: () => import('./switch-test.component').then((m) => m.SwitchTestComponent),
      },
      {
        path: 'tab',
        loadComponent: () => import('./tab-test.component').then((m) => m.TabTestComponent),
      },
      {
        path: 'tooltip',
        loadComponent: () => import('./tooltip-test.component').then((m) => m.TooltipTestComponent),
      },
      {
        path: 'toast',
        loadComponent: () => import('./toast-test.component').then((m) => m.ToastTestComponent),
      },
      {
        path: 'node',
        loadComponent: () => import('./node-test.compnent').then((m) => m.NodeTestComponent),
      },
    ],
  },
]
