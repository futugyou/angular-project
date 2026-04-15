import {
  TabsComponent,
  TabsContentComponent,
  TabsListComponent,
  TabsTriggerComponent,
} from './tab.component'

export const TAB_COMPONENTS = [
  TabsComponent,
  TabsListComponent,
  TabsTriggerComponent,
  TabsContentComponent,
] as const

export { TabsComponent, TabsListComponent, TabsTriggerComponent, TabsContentComponent }
