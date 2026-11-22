import { HttpInterceptorFn } from '@angular/common/http';

export const correlationInterceptor: HttpInterceptorFn = (req, next) => {
  const tracedReq = req.clone({
    setHeaders: {
      'X-Correlation-ID': crypto.randomUUID(),
      'X-Request-ID': crypto.randomUUID(),
    },
  });

  return next(tracedReq);
};