import { Routes } from '@angular/router';

import { staffGuard } from './core/auth';
import { Shell } from './layout/shell';

export const routes: Routes = [
  { path: 'login', title: 'Sign in', loadComponent: () => import('./pages/login/login').then((m) => m.Login) },
  {
    path: '',
    component: Shell,
    canActivate: [staffGuard],
    children: [
      { path: '', title: 'Today', loadComponent: () => import('./pages/dashboard/dashboard').then((m) => m.Dashboard) },
      { path: 'orders', title: 'Orders', loadComponent: () => import('./pages/orders/orders').then((m) => m.Orders) },
      { path: 'products', title: 'Products', loadComponent: () => import('./pages/products/products').then((m) => m.Products) },
      { path: 'products/new', title: 'New product', loadComponent: () => import('./pages/products/product-form').then((m) => m.ProductForm) },
      { path: 'products/:slug', title: 'Edit product', loadComponent: () => import('./pages/products/product-form').then((m) => m.ProductForm) },
      { path: 'inventory', title: 'Stock', loadComponent: () => import('./pages/inventory/inventory').then((m) => m.Inventory) },
      { path: 'returns', title: 'Returns', loadComponent: () => import('./pages/returns/returns').then((m) => m.Returns) },
    ],
  },
  { path: '**', redirectTo: '' },
];
