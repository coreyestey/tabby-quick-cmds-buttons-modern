import { Component } from '@angular/core'
import { ConfigService } from 'tabby-core'

/** @hidden */
@Component({
    template: require('./settingsTab.component.pug'),
})
export class QuickCmdBtnSettingsTabComponent {
    constructor (
        public config: ConfigService,
    ) { }
}
