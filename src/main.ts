import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

let baseUrl = './'
if (window.__MICRO_APP_ENVIRONMENT__) {
  if (window.__MICRO_APP_BASE_ROUTE__) {
    baseUrl = window.__MICRO_APP_BASE_ROUTE__
  } else {
    baseUrl = "/angular/"
  }
} else {
  const path = window.location.pathname;
  baseUrl = path.startsWith('/angular') ? '/angular/' : '/'
}
baseUrl = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/'
const base = document.getElementById('angular-base')!.setAttribute('href', baseUrl);
console.log('href is:', window.location.href, 'base url is:', baseUrl)

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
