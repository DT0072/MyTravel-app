import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { LiveTransitMapComponent } from './live-transit-map.component';

@NgModule({
  imports: [CommonModule, IonicModule],
  declarations: [LiveTransitMapComponent],
  exports: [LiveTransitMapComponent],
})
export class LiveTransitMapModule {}
