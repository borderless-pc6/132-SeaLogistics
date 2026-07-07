import { lazy } from 'react';

export const DashboardCharts = lazy(() =>
  import('./dashboard-charts').then((module) => ({
    default: module.DashboardCharts,
  }))
);
