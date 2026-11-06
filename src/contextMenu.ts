import { Injectable } from '@angular/core'
import { MenuItemOptions } from 'tabby-core'
import { BaseTerminalTabComponent, TerminalContextMenuItemProvider } from 'tabby-terminal'
import { CmdBtnService } from './cmd_btn.service'

@Injectable()
export class QuickCmdBtnContextMenuProvider extends TerminalContextMenuItemProvider {
    weight = 10

    constructor (
        private quickCmdBtn: CmdBtnService,
    ) {
        super()
    }

    async getItems (_tab: BaseTerminalTabComponent): Promise<MenuItemOptions[]> {
        return [
            {
                label: 'Toggle Quick Commands panel',
                click: () => {
                    this.quickCmdBtn.toggle()
                },
            },
        ]
    }
}
