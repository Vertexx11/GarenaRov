import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { PassportService } from '../_services/passport-service';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const _passport = inject(PassportService)
  const passportData = _passport.data()
  const token = passportData?.access_token ? passportData : null
  if (token)  {
    const type = passportData?.token_type
    const access_token = passportData?.access_token
    if (token) {
      const Authorization = `${type} ${access_token}`;
      req = req.clone({
        setHeaders: {
          Authorization
        }
      })
    }
  }
  return next(req);
};
