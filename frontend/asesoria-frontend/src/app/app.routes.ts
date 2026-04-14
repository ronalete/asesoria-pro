import { Routes } from '@angular/router';
import { AdminDashboardComponent } from './features/dashboard/admin-dashboard.component';

export const routes: Routes = [
  { path: '', component: AdminDashboardComponent },
  { path: '**', redirectTo: '' }
];
