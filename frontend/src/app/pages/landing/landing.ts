import { Component } from '@angular/core';
import { Header } from '../../components/landing/header/header';
import { Hero } from '../../components/landing/hero/hero';
import { Features } from '../../components/landing/features/features';
import { Pricing } from '../../components/landing/pricing/pricing';
import { Footer } from '../../components/landing/footer/footer';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [Header, Hero, Features, Pricing, Footer],
  templateUrl: './landing.html',
  styleUrl: './landing.scss',
})
export class Landing {}
