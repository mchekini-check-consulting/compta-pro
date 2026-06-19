import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from './components/landing/header/header';
import { Hero } from './components/landing/hero/hero';
import { Features } from './components/landing/features/features';
import { Pricing } from './components/landing/pricing/pricing';
import { Footer } from './components/landing/footer/footer';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, Hero, Features, Pricing, Footer],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected title = 'Compta Pro';
}
