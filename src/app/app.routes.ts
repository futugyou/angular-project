import { Routes } from '@angular/router'

import { HomeComponent } from './features/home/home.component'
import { OrderMainComponent } from './features/orders/order.component'

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'orders', component: OrderMainComponent },
  { path: '**', redirectTo: '' },
]
