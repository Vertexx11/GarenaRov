import { Injectable, ApplicationRef, EnvironmentInjector, createComponent, ComponentRef, inject } from '@angular/core';
import { Loading } from '../_shared/loading/loading';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment.development';

@Injectable({
  providedIn: 'root',
})
export class LoadingService {
  loadingRequestCount = 0;

  private http = inject(HttpClient); 
  private apiUrl = environment.baseUrl + 'api/v1';
  private loadingComponentRef: ComponentRef<Loading> | null = null;
  private appRef = inject(ApplicationRef);
  private injector = inject(EnvironmentInjector);

  loading(): void {
    if (typeof document === 'undefined') return;

    this.loadingRequestCount++;

    if (this.loadingRequestCount <= 0) return;

    if (!this.loadingComponentRef) {
      this.loadingComponentRef = createComponent(Loading, {
        environmentInjector: this.injector
      });
      document.body.appendChild(this.loadingComponentRef.location.nativeElement);
      this.appRef.attachView(this.loadingComponentRef.hostView);
    }

    this.loadingComponentRef.instance.show();
  }

  idle(): void {
    if (typeof document === 'undefined') return;

    this.loadingRequestCount--;

    if (this.loadingRequestCount > 0) return;
    if (this.loadingComponentRef === null) return;

    this.loadingComponentRef.instance.hide();
    this.appRef.detachView(this.loadingComponentRef.hostView);
    this.loadingComponentRef.location.nativeElement.remove();
    this.loadingComponentRef.destroy();
    this.loadingComponentRef = null;
  }

}