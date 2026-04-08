import { Component, signal } from '@angular/core'
import { CommonModule } from '@angular/common'
import { NgIconsModule } from '@ng-icons/core'
import { TAB_COMPONENTS } from '@shared/ui/tab.component'

@Component({
  selector: 'app-tab-test',
  standalone: true,
  imports: [CommonModule, NgIconsModule, ...TAB_COMPONENTS],
  template: `
    <h1 class="text-2xl font-bold mb-6 text-gray-800">Tab Component Test</h1>
    <app-tabs [(value)]="currentTab">
      <app-tabs-list>
        <button tabsTrigger value="account">Account Settings</button>
        <button tabsTrigger value="password">Security Password</button>
        <button tabsTrigger value="notifications" disabled>Notifications</button>
      </app-tabs-list>

      <app-tabs-content value="account">
        <div class="p-4 border rounded-lg bg-card">
          <h3 class="font-medium">Account Details</h3>
          <p class="text-sm text-muted-foreground">Update your profile and email address here.</p>
        </div>
      </app-tabs-content>

      <app-tabs-content value="password">
        <div class="p-4 border rounded-lg bg-card">
          <h3 class="font-medium">Change Password</h3>
          <p class="text-sm text-muted-foreground">
            For security purposes, it is recommended to regularly update to a strong password.
          </p>
        </div>
      </app-tabs-content>
    </app-tabs>

    <p class="mt-4 text-xs text-gray-400">Currently selected tab: {{ currentTab }}</p>
  `,
})
export class TabTestComponent {
  // tabs
  currentTab = 'account'
}
