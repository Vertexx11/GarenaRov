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
    // ✅ เพิ่มบรรทัดนี้: ป้องกัน Error document is not defined
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
    // ✅ เพิ่มบรรทัดนี้ด้วย
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