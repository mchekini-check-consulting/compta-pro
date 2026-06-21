import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from '../../services/auth';
import { Sidebar } from '../../components/dashboard/sidebar/sidebar';
import { TasksStore } from '../../services/tasks.store';

@Component({
  selector: 'app-cabinet-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterOutlet, Sidebar],
  templateUrl: './cabinet-layout.html',
  styleUrl: './cabinet-layout.scss'
})
export class CabinetLayout implements OnInit {
  cabinetName = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private tasksStore: TasksStore
  ) {}

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    const user = this.authService.getUser();
    if (user) {
      this.cabinetName = user.cabinetName;

      // Rediriger vers le dashboard de verification si le compte n'est pas valide
      if (user.accountStatus === 'PENDING_VERIFICATION') {
        this.router.navigate(['/dashboard']);
        return;
      }
    }

    // Synchronise les taches avec les dossiers reels (badge sidebar correct partout).
    this.tasksStore.loadFromBackend();
  }

  logout(): void {
    this.authService.logout();
  }
}
