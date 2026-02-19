import { Injectable, inject } from '@angular/core';
import { NavigationExtras, Router } from '@angular/router';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';
import { Observable, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ErrorService {

  private _router = inject(Router);
  private _snackBar = inject(MatSnackBar);

  private _snackBarConfig: MatSnackBarConfig = {
    horizontalPosition: 'right',
    verticalPosition: 'top',
    duration: 3000 // เพิ่ม duration ให้มันหายเองได้
  };

  handleError(error: any): Observable<never> {
    
    // ✅ 1. เช็คก่อนเลยว่า Error มาจาก URL ไหน?
    const url = error.url || '';
    
    // ✅ 2. ถ้ามาจาก 'view/gets' (Polling) ห้ามเปลี่ยนหน้าเด็ดขาด!
    // เพราะมันทำงานเบื้องหลัง ถ้าเปลี่ยนหน้า user จะรำคาญ
    const isPolling = url.includes('view/gets');

    if (error) {
      switch (error.status) {
        case 400:
          this._snackBar.open('record not found', 'ok', this._snackBarConfig);
          break;

        case 401:
          this._snackBar.open('Invalid username or password', 'ok', this._snackBarConfig);
          // ปกติ 401 อาจจะต้อง Redirect ไป Login แต่ถ้า Polling อาจจะแค่แจ้งเตือนก็ได้
          break;

        case 404:
          if (url.includes('join') || isPolling) {
            console.warn('API 404 ignored for polling/join');
            break;
          }
          this._router.navigate(['/not-found']);
          break;

        case 500:
        case 501:
        case 502:
        case 503:
        case 504:
        case 505:
        case 506:
        case 507:
        case 508:
        case 509:
        case 510:
        case 511:
          if (isPolling) {
            console.error('Polling Server Error (Ignored navigation):', error.status);
            break; 
          }

          const navExtra: NavigationExtras = {
            state: { error: error.error }
          };
          this._router.navigate(['/server-error'], navExtra);
          break;

        default:
          if (!isPolling) {
             this._snackBar.open('something unexpected happened. please try again later.', 'ok', this._snackBarConfig);
          }
          break;
      }
    }

    return throwError(() => error);
  }
}