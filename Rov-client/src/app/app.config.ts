import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core'; 
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http'; 

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { loadingInterceptor } from './_interceptors/loading-interceptor';
import { errorInterceptor } from './_interceptors/error-interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),  
    provideRouter(routes),
    
    provideHttpClient(withFetch()), 

    provideClientHydration(withEventReplay()),
    provideHttpClient( withInterceptors([ loadingInterceptor , errorInterceptor ]) ),
  ]
};