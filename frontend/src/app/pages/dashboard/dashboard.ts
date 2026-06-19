import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';
import { DocumentUpload } from '../../components/dashboard/document-upload/document-upload';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, DocumentUpload],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class Dashboard implements OnInit {
  cabinetName = '';
  isPendingVerification = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    const user = this.authService.getUser();
    if (user) {
      this.cabinetName = user.cabinetName;
      this.isPendingVerification = user.accountStatus === 'PENDING_VERIFICATION';
    }
  }

  logout(): void {
    this.authService.logout();
  }
}
