import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth';
import { debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register implements OnInit {
  registerForm!: FormGroup;
  isSubmitting = false;
  successMessage = '';
  errorMessage = '';
  showPassword = false;
  showConfirmPassword = false;

  passwordCriteria = {
    minLength: false,
    hasUppercase: false,
    hasNumber: false,
    hasSpecial: false
  };

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.setupEmailValidation();
    this.setupPasswordValidation();
  }

  private initForm(): void {
    this.registerForm = this.fb.group({
      cabinetName: ['', [Validators.required]],
      address: ['', [Validators.required]],
      siren: ['', [Validators.required, Validators.pattern(/^[0-9]{9}$/)]],
      registrationNumber: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^0[0-9]{9}$/)]],
      password: ['', [Validators.required, this.passwordValidator.bind(this)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  private setupEmailValidation(): void {
    const emailControl = this.registerForm.get('email');
    if (emailControl) {
      emailControl.valueChanges.pipe(
        debounceTime(500),
        distinctUntilChanged(),
        switchMap(email => {
          if (email && emailControl.valid) {
            return this.authService.checkEmailExists(email);
          }
          return of(null);
        })
      ).subscribe(result => {
        if (result?.exists) {
          emailControl.setErrors({ ...emailControl.errors, emailExists: true });
        }
      });
    }
  }

  private setupPasswordValidation(): void {
    const passwordControl = this.registerForm.get('password');
    if (passwordControl) {
      passwordControl.valueChanges.subscribe(password => {
        this.updatePasswordCriteria(password);
      });
    }
  }

  private updatePasswordCriteria(password: string): void {
    this.passwordCriteria = {
      minLength: password?.length >= 8,
      hasUppercase: /[A-Z]/.test(password || ''),
      hasNumber: /[0-9]/.test(password || ''),
      hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password || '')
    };
  }

  private passwordValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.value;
    if (!password) return null;

    const hasMinLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    if (hasMinLength && hasUppercase && hasNumber && hasSpecial) {
      return null;
    }

    return { passwordStrength: true };
  }

  private passwordMatchValidator(group: FormGroup): ValidationErrors | null {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;

    if (password && confirmPassword && password !== confirmPassword) {
      group.get('confirmPassword')?.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }

    return null;
  }

  onSirenInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/\D/g, '').slice(0, 9);
    this.registerForm.get('siren')?.setValue(input.value);
  }

  onPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/\D/g, '').slice(0, 10);
    this.registerForm.get('phone')?.setValue(input.value);
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  getErrorMessage(fieldName: string): string {
    const control = this.registerForm.get(fieldName);
    if (!control || !control.errors || !control.touched) return '';

    const errors = control.errors;

    switch (fieldName) {
      case 'cabinetName':
        if (errors['required']) return 'Le nom du cabinet est obligatoire';
        break;
      case 'address':
        if (errors['required']) return "L'adresse est obligatoire";
        break;
      case 'siren':
        if (errors['required']) return 'Le SIREN est obligatoire';
        if (errors['pattern']) return 'SIREN invalide — 9 chiffres requis';
        break;
      case 'registrationNumber':
        if (errors['required']) return "Le numero d'immatriculation est obligatoire";
        break;
      case 'email':
        if (errors['required']) return "L'email est obligatoire";
        if (errors['email']) return 'Format email invalide';
        if (errors['emailExists']) return 'Cette adresse email est deja utilisee';
        break;
      case 'phone':
        if (errors['required']) return 'Le numero de telephone est obligatoire';
        if (errors['pattern']) return 'Numero de telephone invalide — format attendu : 0XXXXXXXXX';
        break;
      case 'password':
        if (errors['required']) return 'Le mot de passe est obligatoire';
        if (errors['passwordStrength']) return 'Le mot de passe ne respecte pas les criteres de securite';
        break;
      case 'confirmPassword':
        if (errors['required']) return 'La confirmation du mot de passe est obligatoire';
        if (errors['passwordMismatch']) return 'Les mots de passe ne correspondent pas';
        break;
    }

    return '';
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.registerForm.get(fieldName);
    return !!(control && control.invalid && control.touched);
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      Object.keys(this.registerForm.controls).forEach(key => {
        this.registerForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.register(this.registerForm.value).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        if (response.success) {
          this.successMessage = response.message;
          this.registerForm.reset();
        }
      },
      error: (error) => {
        this.isSubmitting = false;
        if (error.error?.message) {
          this.errorMessage = error.error.message;
        } else {
          this.errorMessage = 'Une erreur est survenue. Veuillez reessayer.';
        }
      }
    });
  }
}
