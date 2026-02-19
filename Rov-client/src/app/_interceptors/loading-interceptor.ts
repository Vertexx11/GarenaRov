import { HttpInterceptorFn } from '@angular/common/http';
import { finalize } from 'rxjs/internal/operators/finalize';
import { LoadingService } from '../_services/loading-service';
import { delay } from 'rxjs/internal/operators/delay';
import { inject } from '@angular/core/primitives/di';

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  // Skip global loading spinner for silent polling requests
  if (req.url.includes('view/gets')) {
    return next(req);
  }

  const loadingService = inject(LoadingService);
  loadingService.loading();
  return next(req).pipe(
    // delay(1000), 
    finalize(() => loadingService.idle())
  );
}
