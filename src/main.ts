import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

const base = document.getElementById('angular-base')!;
if (window.__MICRO_APP_BASE_ROUTE__) {
  base.setAttribute('href', window.__MICRO_APP_BASE_ROUTE__);
}

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
