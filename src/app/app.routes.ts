import { Routes } from '@angular/router'

import { HomeComponent } from './features/home/home.component'
import { OrderMainComponent } from './features/orders/order.component'
import { TestingComponent } from './features/testing/test.component'
// DevuiComponent size is too large.
// import { DevuiComponent } from './devui/devui.component'

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'orders', component: OrderMainComponent },
  {
    path: 'devui',
    // component: DevuiComponent,
    loadComponent: () => import('./devui/devui.component').then((m) => m.DevuiComponent),
  },
  { path: 'testing', component: TestingComponent },
  { path: '**', redirectTo: '' },
]
