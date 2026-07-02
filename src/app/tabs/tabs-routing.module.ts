import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProfileSectionPage } from '../profile-section/profile-section.page';
import { TabsPage } from './tabs.page';

const routes: Routes = [
  {
    path: 'tabs',
    component: TabsPage,
    children: [
      {
        path: 'tab1',
        loadChildren: () => import('../tab1/tab1.module').then(m => m.Tab1PageModule)
      },
      {
        path: 'tab2',
        loadChildren: () => import('../tab2/tab2.module').then(m => m.Tab2PageModule)
      },
      {
        path: 'tab3',
        loadChildren: () => import('../tab3/tab3.module').then(m => m.Tab3PageModule)
      },
      {
        path: 'tab4',
        loadChildren: () => import('../tab4/tab4.module').then(m => m.Tab4PageModule)
      },
      {
        path: 'profile/my-contributions',
        component: ProfileSectionPage,
        data: { section: 'my-contributions' }
      },
      {
        path: 'profile/settings',
        component: ProfileSectionPage,
        data: { section: 'settings' }
      },
      {
        path: 'profile/journey-history',
        component: ProfileSectionPage,
        data: { section: 'journey-history' }
      },
      {
        path: 'profile/saved-destinations',
        component: ProfileSectionPage,
        data: { section: 'saved-destinations' }
      },
      {
        path: 'profile/privacy',
        component: ProfileSectionPage,
        data: { section: 'privacy' }
      },
      {
        path: 'profile/help',
        component: ProfileSectionPage,
        data: { section: 'help' }
      },
      {
        path: '',
        redirectTo: '/tabs/tab1',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: '',
    redirectTo: '/tabs/tab1',
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
})
export class TabsPageRoutingModule {}
