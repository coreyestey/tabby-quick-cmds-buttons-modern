import { Injectable } from '@angular/core'
import { TerminalDecorator, BaseTerminalTabComponent, BaseSession } from 'tabby-terminal'
import { CmdBtnService } from './cmd_btn.service'


@Injectable()
export class QuickCmdBtnDecorator extends TerminalDecorator {
    constructor (
        private quickCmdBtn: CmdBtnService,
    ) {
        super()
    }

    attach (tab: BaseTerminalTabComponent): void {
        this.quickCmdBtn.addTab(tab)
        // subscribeUntilDetached cancels these automatically when the tab closes,
        // so the subscriptions never outlive the terminal they belong to.
        this.subscribeUntilDetached(tab, tab.sessionChanged$.subscribe(session => {
            if (session) {
                this.attachToSession(tab, session)
            }
        }))
        if (tab.session) {
            this.attachToSession(tab, tab.session)
        }
    }

    detach (tab: BaseTerminalTabComponent): void {
        this.quickCmdBtn.removeTab(tab)
        super.detach(tab)
    }

    private attachToSession (tab: BaseTerminalTabComponent, session: BaseSession) {
        const thisVar = this
        this.subscribeUntilDetached(tab, session.output$.subscribe(data => {
            for (let element of thisVar.quickCmdBtn.qcCmds) {
                // Commands in the "auto" group are fired automatically whenever
                // their name appears in the terminal output stream.
                if (element.group === 'auto' && data.includes(element.name)) {
                    thisVar.quickCmdBtn.sendCmdToFocusTab(element)
                }
            }
        }))
    }
}
