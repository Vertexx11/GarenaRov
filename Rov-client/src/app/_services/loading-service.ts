import { Injectable, ApplicationRef, EnvironmentInjector, createComponent, ComponentRef, inject } from '@angular/core';
import { Loading } from '../_shared/loading/loading';

@Injectable({
  providedIn: 'root',
})
export class LoadingService {
  loadingRequestCount = 0;

  private loadingComponentRef: ComponentRef<Loading> | null = null;
  private appRef = inject(ApplicationRef);
  private injector = inject(EnvironmentInjector);

  loading(): void {
    this.loadingRequestCount++;

    if (this.loadingRequestCount <= 0) return;

    if (!this.loadingComponentRef) {
      this.loadingComponentRef = createComponent(Loading, {
        environmentInjector: this.injector
      });

      // Attach to the view
      document.body.appendChild(this.loadingComponentRef.location.nativeElement);
      
      // Attach to the change detection
      this.appRef.attachView(this.loadingComponentRef.hostView);
    }

    // Show the loading spinner
    this.loadingComponentRef.instance.show();
  }

  idle(): void {
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