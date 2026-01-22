import { Component, inject, signal } from '@angular/core';
import { FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatButton, MatAnchor } from "@angular/material/button";
import { PasswordValidator } from '../_helpers/password.validator';
import { PasswordMatchValidator } from '../_helpers/password-match.validator';
import { PassportService } from '../_services/passport-service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatLabel, MatInput, MatAnchor, MatButton],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  mode: 'login' | 'register' = 'login'
  form: FormGroup

  private _routerService = inject(Router)
  private _passportService = inject(PassportService)
  errorFromServer = ''

  async onSubmit(): Promise<void> {
    try {
      if (this.mode === 'login') {
        this.errorFromServer = await this._passportService.get(this.form.value);
      } else {

        this.errorFromServer = await this._passportService.new(this.form.value);
      }

      if (this.errorFromServer === '') {
        this._routerService.navigate(['/']);
      }
    } catch (error) {

      this.errorFromServer = 'record not found';
    }
  }

  errorMessage = {
    username: signal(''),
    password: signal(''),
    confirm_password: signal(''),
    display_name: signal('')
  }

  constructor() {
    this.form = new FormGroup({
      username: new FormControl('', [
        Validators.required,
        Validators.maxLength(16),
        Validators.minLength(4)
      ]),
      display_name: new FormControl('', [
        Validators.required,
        Validators.maxLength(16),
        Validators.minLength(4)
      ]),
      password: new FormControl('', [
        Validators.required,
        Validators.maxLength(16),
        Validators.minLength(8),
        PasswordValidator(8, 16)
      ])
    })

    this.updateForm();
  }

  toggleMode() {
    this.mode = this.mode === 'login' ? 'register' : 'login'
    this.updateForm()
  }

  private updateForm(): void {
    if (this.mode === 'register') {
      if (!this.form.contains('confirm_password')) {
        this.form.addControl('confirm_password', new FormControl('', [Validators.required]));
      }
      if (!this.form.contains('display_name')) {
        this.form.addControl('display_name', new FormControl('', [Validators.required]));
      }
      this.form.addValidators(PasswordMatchValidator('password', 'confirm_password'))
    } else {
      this.form.removeControl('confirm_password')
      this.form.removeControl('display_name')
      this.form.removeValidators(PasswordMatchValidator('password', 'confirm_password'))
    }
    this.form.updateValueAndValidity();
  }

  updateErrorMessage(ctrlName: string): void {
    const control = this.form.controls[ctrlName]
    if (!control) return
    switch (ctrlName) {
      case 'username':
        if (control.hasError('required')) this.errorMessage.username.set('required')
        else if (control.hasError('minlength')) {
          this.errorMessage.username.set('must be at least 4 characters long')
        }
        else if (control.hasError('maxlength')) {
          this.errorMessage.username.set('must be  16 characters or less')
        }
        else this.errorMessage.username.set('')

        break
      case 'password':
        if (control.hasError('required')) this.errorMessage.password.set('required')

        else if (control.hasError('invalidMinLength')) {
          this.errorMessage.password.set(`must be at least 8 characters long`)
        }
        else if (control.hasError('invalidMaxLength')) {
          this.errorMessage.password.set(`must be 16 characters or less`)
        }
        else if (control.hasError('invalidLowcase')) {
          this.errorMessage.password.set('must contain at least one lowercase letter')
        }
        else if (control.hasError('invalidUppercase')) {
          this.errorMessage.password.set('must contain at least one uppercase letter')
        }
        else if (control.hasError('invalidNumberic')) {
          this.errorMessage.password.set('must contain at least one number')
        }
        else if (control.hasError('invalidSpacialChar')) {
          this.errorMessage.password.set('must contain at least one special character: !@#$%^&*(),.?":{}|<>')
        }
        else this.errorMessage.password.set('')

        break
      case 'confirm_password':
        if (control.hasError('required')) this.errorMessage.confirm_password.set('required')

        else if (control.hasError('mismatch')) {
          this.errorMessage.confirm_password.set('passwords do not match')
        }
        else this.errorMessage.confirm_password.set('')
        break
      case 'display_name':
        if (control.hasError('required')) this.errorMessage.display_name.set('required')

        else if (control.hasError('minlength')) {
          this.errorMessage.display_name.set('must be at least 4 characters long')
        }
        else if (control.hasError('maxlength')) {
          this.errorMessage.display_name.set('must be  16 characters or less')
        }
        else this.errorMessage.display_name.set('')

        break
    }
  }
}