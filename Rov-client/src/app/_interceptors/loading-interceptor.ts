import { HttpInterceptorFn } from '@angular/common/http';
import { finalize } from 'rxjs/internal/operators/finalize';
import { LoadingService } from '../_services/loading-service';
import { delay } from 'rxjs/internal/operators/delay';
import { inject } from '@angular/core/primitives/di';

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loadingService = inject(LoadingService);
  loadingService.loading();
  return next(req).pipe(
    delay(1000), // for testing
    finalize(() => loadingService.idle())
  );
}
