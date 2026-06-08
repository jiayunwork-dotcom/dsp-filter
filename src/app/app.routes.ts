import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/main/main.component').then(m => m.MainComponent)
  },
  {
    path: 'tutorial',
    loadComponent: () => import('./components/tutorial/tutorial.component').then(m => m.TutorialComponent)
  },
  {
    path: 'windows',
    loadComponent: () => import('./components/window-comparison/window-comparison.component').then(m => m.WindowComparisonComponent)
  }
];
