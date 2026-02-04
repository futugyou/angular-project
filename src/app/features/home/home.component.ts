import { Component, signal } from '@angular/core'
import { RouterOutlet } from '@angular/router'

@Component({
  selector: 'home-root',
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class HomeComponent {
  protected readonly title = signal('angular-project')
}
