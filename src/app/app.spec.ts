import { render, screen, waitFor } from '@testing-library/angular'
import { App } from './app'
import { provideRouter } from '@angular/router'
import { provideIcons } from '@ng-icons/core'
import { lucideHome, lucideLayoutDashboard, lucideClipboardList } from '@ng-icons/lucide'

describe('App Component Navigation', () => {
  it('The Home link should be displayed after rendering is complete.', async () => {
    await render(App, {
      providers: [
        provideRouter([{ path: '', component: App }]),
        provideIcons({ lucideHome, lucideLayoutDashboard, lucideClipboardList }),
      ],
    })

    const homeLink = await screen.findByRole('link', { name: /home/i })

    expect(homeLink).toBeTruthy()
    expect(homeLink.getAttribute('href')).toBe('/')
  })
})
