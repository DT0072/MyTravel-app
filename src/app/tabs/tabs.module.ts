import { IonicModule } from '@ionic/angular';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TopbarModule } from '../shared/topbar/topbar.module';
import { ProfileSectionPage } from '../profile-section/profile-section.page';

import { TabsPageRoutingModule } from './tabs-routing.module';

import { TabsPage } from './tabs.page';

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    TopbarModule,
    TabsPageRoutingModule
  ],
  declarations: [TabsPage, ProfileSectionPage]
})
export class TabsPageModule {}
