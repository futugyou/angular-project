import { Routes } from '@angular/router'

import { HomeComponent } from './features/home/home.component'
import { OrderMainComponent } from './features/orders/order.component'
// import { TestingComponent } from './features/testing/test.component'
// DevuiComponent size is too large.
// import { DevuiComponent } from './devui/devui.component'

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
  },
  {
    path: 'orders',
    component: OrderMainComponent,
    data: { showToggle: true },
  },
  {
    path: 'devui',
    // component: DevuiComponent,
    loadComponent: () => import('./features/devui/devui.component').then((m) => m.DevuiComponent),
    data: { forceFullScreen: true },
  },
  {
    path: 'testing',
    // component: TestingComponent,
    loadComponent: () =>
      import('./features/testing/test.component').then((m) => m.TestingComponent),
    data: { showToggle: true },
  },
  { path: '**', redirectTo: '' },
]
