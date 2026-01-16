import { HttpInterceptorFn } from '@angular/common/http';
import { error } from 'console';
import { catchError } from 'rxjs/internal/operators/catchError';
import { ErrorService } from '../_services/error-service';
import { inject } from '@angular/core/primitives/di';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const errorService = inject(ErrorService);
  return next(req).pipe(
    catchError(e => errorService.handleError(e))
  );
};
