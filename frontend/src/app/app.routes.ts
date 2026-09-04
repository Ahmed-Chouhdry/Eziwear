import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layout/shell/shell').then((m) => m.Shell),
    children: [
      {
        path: '',
        loadComponent: () => import('./features/home/home').then((m) => m.Home),
        title: 'EZiWear — Premium Streetwear',
      },
      {
        path: 'shop',
        loadComponent: () => import('./features/shop/shop').then((m) => m.Shop),
        title: 'Shop — EZiWear',
      },
      {
        path: 'shop/:category',
        loadComponent: () => import('./features/shop/shop').then((m) => m.Shop),
      },
      {
        path: 'product/:slug',
        loadComponent: () => import('./features/product/product').then((m) => m.ProductPage),
      },
      {
        path: 'cart',
        loadComponent: () => import('./features/cart/cart-page').then((m) => m.CartPage),
        title: 'Cart — EZiWear',
      },
      {
        path: 'checkout',
        loadComponent: () => import('./features/checkout/checkout').then((m) => m.Checkout),
        title: 'Checkout — EZiWear',
        canActivate: [authGuard],
      },
      {
        path: 'wishlist',
        loadComponent: () => import('./features/wishlist/wishlist').then((m) => m.Wishlist),
        title: 'Wishlist — EZiWear',
      },
      {
        path: 'account',
        loadComponent: () =>
          import('./features/account/account-layout/account-layout').then((m) => m.AccountLayout),
        title: 'My Account — EZiWear',
        canActivate: [authGuard],
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'profile' },
          {
            path: 'profile',
            loadComponent: () =>
              import('./features/account/profile/profile').then((m) => m.Profile),
          },
          {
            path: 'orders',
            loadComponent: () => import('./features/orders/orders').then((m) => m.Orders),
            title: 'My Orders — EZiWear',
          },
          {
            path: 'addresses',
            loadComponent: () =>
              import('./features/account/addresses/addresses').then((m) => m.Addresses),
            title: 'Addresses — EZiWear',
          },
        ],
      },
      {
        path: 'order/:orderNumber',
        loadComponent: () =>
          import('./features/orders/order-detail/order-detail').then((m) => m.OrderDetail),
        title: 'Order — EZiWear',
        canActivate: [authGuard],
      },
      {
        path: 'about',
        loadComponent: () => import('./features/static/static-page').then((m) => m.StaticPage),
      },
      {
        path: 'support/size-guide',
        loadComponent: () => import('./features/static/size-guide/size-guide').then((m) => m.SizeGuide),
        title: 'Size Guide — EZiWear',
      },
      {
        path: 'support/:slug',
        loadComponent: () => import('./features/static/static-page').then((m) => m.StaticPage),
      },
      {
        path: 'legal/:slug',
        loadComponent: () => import('./features/static/static-page').then((m) => m.StaticPage),
      },
    ],
  },
  {
    path: 'auth',
    loadComponent: () => import('./features/auth/auth-layout').then((m) => m.AuthLayout),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'login' },
      {
        path: 'login',
        loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
        title: 'Sign in — EZiWear',
      },
      {
        path: 'register',
        loadComponent: () => import('./features/auth/register/register').then((m) => m.Register),
        title: 'Create account — EZiWear',
      },
      {
        path: 'forgot-password',
        loadComponent: () =>
          import('./features/auth/forgot-password/forgot-password').then((m) => m.ForgotPassword),
        title: 'Reset password — EZiWear',
      },
      {
        path: 'reset-password',
        loadComponent: () =>
          import('./features/auth/reset-password/reset-password').then((m) => m.ResetPassword),
        title: 'New password — EZiWear',
      },
    ],
  },
  {
    path: 'admin',
    loadComponent: () => import('./features/admin/admin-layout/admin-layout').then((m) => m.AdminLayout),
    canActivate: [adminGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/admin/dashboard/dashboard').then((m) => m.Dashboard),
        title: 'Admin — EZiWear',
      },
      {
        path: 'products',
        loadComponent: () =>
          import('./features/admin/products/product-list/product-list').then((m) => m.ProductList),
        title: 'Products — Admin',
      },
      {
        path: 'products/new',
        loadComponent: () =>
          import('./features/admin/products/product-form/product-form').then((m) => m.ProductForm),
        title: 'New Product — Admin',
      },
      {
        path: 'products/:id/edit',
        loadComponent: () =>
          import('./features/admin/products/product-form/product-form').then((m) => m.ProductForm),
        title: 'Edit Product — Admin',
      },
      {
        path: 'categories',
        loadComponent: () =>
          import('./features/admin/categories/categories').then((m) => m.Categories),
        title: 'Categories — Admin',
      },
      {
        path: 'sliders',
        loadComponent: () =>
          import('./features/admin/sliders-ads/sliders-ads').then((m) => m.SlidersAds),
        title: 'Sliders & Ads — Admin',
      },
      {
        path: 'orders',
        loadComponent: () =>
          import('./features/admin/orders/order-list/order-list').then((m) => m.OrderList),
        title: 'Orders — Admin',
      },
      {
        path: 'orders/:orderNumber',
        loadComponent: () =>
          import('./features/admin/orders/order-detail/order-detail').then((m) => m.AdminOrderDetail),
        title: 'Order — Admin',
      },
      {
        path: 'customers',
        loadComponent: () =>
          import('./features/admin/customers/customer-list/customer-list').then((m) => m.CustomerList),
        title: 'Customers — Admin',
      },
      {
        path: 'customers/:id',
        loadComponent: () =>
          import('./features/admin/customers/customer-detail/customer-detail').then(
            (m) => m.CustomerDetail,
          ),
        title: 'Customer — Admin',
      },
      {
        path: 'coupons',
        loadComponent: () => import('./features/admin/coupons/coupons').then((m) => m.Coupons),
        title: 'Coupons — Admin',
      },
      {
        path: 'reviews',
        loadComponent: () => import('./features/admin/reviews/reviews').then((m) => m.Reviews),
        title: 'Reviews — Admin',
      },
    ],
  },
  {
    path: '**',
    loadComponent: () => import('./features/not-found/not-found').then((m) => m.NotFound),
    title: 'Page not found — EZiWear',
  },
];
