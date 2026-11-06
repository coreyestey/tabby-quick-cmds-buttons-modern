import { Injectable } from '@angular/core'
import { ConfigService, HotkeysService } from 'tabby-core'
import { createApp } from 'vue'
// import { ref } from 'vue'
import {Tabs, Tab} from 'vue3-tabs-component';
import 'tabs-component.css';

@Injectable({ providedIn: 'root'})
export class CmdBtnService {
    public  tabs = []
    private app: any = null
    private div: HTMLElement | null = null
    private subscriptions: any[] = []
    private visible = true

    /**
     * Quick Commands live in the separate tabby-quick-cmds plugin under the
     * `qc` config namespace, which may not exist if that plugin is not
     * installed or has never created a command. Always read through this
     * guard so a missing namespace cannot throw.
     */
    public get qcCmds (): any[] {
        return this.config.store?.qc?.cmds ?? []
    }

    private ensureQcCmds (): any[] {
        if (!this.config.store.qc) {
            this.config.store.qc = { cmds: [] }
        }
        if (!this.config.store.qc.cmds) {
            this.config.store.qc.cmds = []
        }
        return this.config.store.qc.cmds
    }

    constructor (
        public config: ConfigService,
        private hotkeys: HotkeysService,
    ) {
        // Clean up any previous instance
        this.cleanup()
        console.log('✓ CmdBtnService loaded with quick-add feature')

        // Unique marker to verify THIS version is loaded
        const markerEl = document.createElement('div')
        markerEl.id = 'PLUGIN_VERSION_MARKER_QUICK_COMMAND_PARAMETERS'
        markerEl.style.display = 'none'
        document.body.appendChild(markerEl)

        const div = document.createElement('div')
        div.className = 'quick-cmd-panel'
        div.setAttribute("id", 'app-parent')
        console.log('✓ Created #app-parent div')

        const appDiv = document.createElement('div')
        appDiv.setAttribute("id", 'app')
        appDiv.className = 'quick-cmd-app'
        div.appendChild(appDiv)
        document.querySelector('body').appendChild(div)

        const templateHTML = `
            <div class="quick-cmd-shell">
                <!-- Header Section -->
                <div id="app-parent-header" class="quick-cmd-header">
                    <span class="quick-cmd-title">Quick Commands</span>
                    <div class="quick-cmd-header-actions">
                        <label v-show="!minimized" title="When checked, commands are typed into the terminal without pressing Enter, so you can edit them first" class="quick-cmd-edit-toggle">
                            <input type="checkbox" v-model="editBeforeSend" />
                            <span>Edit first</span>
                        </label>
                        <button v-show="!minimized" @click="showCreateCommandDialog" title="Add a new quick command" class="btn btn-sm btn-primary quick-cmd-add-button">+ Add Command</button>
                        <button @click="toggleMinimized" :title="minimized ? 'Expand panel' : 'Minimize panel'" class="btn btn-sm btn-secondary quick-cmd-window-button">{{ minimized ? '▢' : '—' }}</button>
                        <button @click="closePanel" title="Close panel" class="btn btn-sm btn-secondary quick-cmd-window-button">✕</button>
                    </div>
                </div>

                <div v-show="isTabVisible===false && !minimized" :class="{'use-fixed-theme': !isUseSystemTheme}" class="quick-cmd-content quick-cmd-command-list">
                    <button @click="sendCmd(cmd)" @contextmenu="openCmdContextMenu($event, cmd)" v-for="(cmd, cmdIndex) in cmds" :key="cmdIndex" :title="(cmd.description || cmd.text || '') + ' | Right-click to edit/delete'" class="btn btn-sm btn-secondary quick-cmd-command-button">
                        {{ cmd.name }}
                    </button>
                </div>
                <div v-show="isTabVisible && !minimized" :class="[{'use-fixed-theme': !isUseSystemTheme}, {'is-tabs-collapsed': tabsCollapsed}]" class="quick-cmd-content quick-cmd-tabs-container" @click.capture="handleTabHeaderClick">
                    <tabs ref="cmdTabs" :options="{ useUrlFragment: false }" >
                        <tab v-bind:name="cmdGroup" v-for="(cmds, cmdGroup) in tabToCmds" :key="cmdGroup">
                            <div class="quick-cmd-command-list">
                                <button @click="sendCmd(cmd)" @contextmenu="openCmdContextMenu($event, cmd)" v-for="(cmd, cmdIndex) in cmds" :key="cmdGroup + '-' + cmdIndex" :title="(cmd.description || cmd.text || '') + ' | Right-click to edit/delete'" class="btn btn-sm btn-secondary quick-cmd-command-button">
                                    {{ cmd.name }}
                                </button>
                            </div>
                        </tab>
                    </tabs>
                </div>

                <!-- Create/Edit Command Dialog -->
                <div v-if="showDialog" class="quick-cmd-dialog-backdrop">
                    <div class="quick-cmd-dialog" @click.stop @mousedown.stop @keydown.stop @keyup.stop @keypress.stop>
                        <h3 class="quick-cmd-dialog-title">{{ editingExistingCommand ? 'Edit Command' : 'Create New Command' }}</h3>
                        <div class="quick-cmd-form-group">
                            <label class="quick-cmd-form-label">Command Name</label>
                            <input v-model="newCmd.name" type="text" class="form-control quick-cmd-form-control" placeholder="e.g., List Files" @click.stop />
                        </div>
                        <div class="quick-cmd-form-group">
                            <label class="quick-cmd-form-label">Command Text</label>
                            <textarea v-model="newCmd.text" class="form-control quick-cmd-form-control quick-cmd-command-text" placeholder="e.g., ls -la" @click.stop />
                        </div>
                        <div class="quick-cmd-form-group">
                            <label class="quick-cmd-form-label">Description</label>
                            <input v-model="newCmd.description" type="text" class="form-control quick-cmd-form-control" placeholder="What does this command do?" @click.stop />
                        </div>
                        <div class="quick-cmd-form-group">
                            <label class="quick-cmd-form-label">Group/Tab</label>
                            <input v-model="newCmd.group" type="text" class="form-control quick-cmd-form-control" placeholder="e.g., System" @click.stop />
                        </div>
                        <div class="quick-cmd-form-group quick-cmd-form-group-last">
                            <label class="quick-cmd-checkbox-label">
                                <input v-model="newCmd.appendCR" type="checkbox" />
                                <span>Append newline (Enter)</span>
                            </label>
                        </div>
                        <div class="quick-cmd-dialog-actions">
                            <button @click="closeDialog" class="btn btn-secondary">Cancel</button>
                            <button @click="saveCommand" class="btn btn-primary">Save Command</button>
                        </div>
                    </div>
                </div>

                <!-- Quick Cmds-compatible Parameter Dialog -->
                <div v-if="showParameterDialog" class="quick-cmd-dialog-backdrop">
                    <div class="quick-cmd-dialog quick-cmd-parameter-dialog" @click.stop @mousedown.stop @keydown.stop @keyup.stop @keypress.stop>
                        <h3 class="quick-cmd-dialog-title">Command Parameters</h3>
                        <p class="quick-cmd-dialog-description">Enter values for the variables used by this Quick Command.</p>
                        <div v-for="parameter in parameterFields" :key="parameter.name" class="quick-cmd-form-group">
                            <label class="quick-cmd-form-label">{{ parameter.name }}</label>
                            <input v-model="parameter.value" type="text" class="form-control quick-cmd-form-control" :placeholder="'Value for ' + parameter.name" autocomplete="off" @click.stop />
                        </div>
                        <div class="quick-cmd-dialog-actions">
                            <button @click="cancelParameterDialog" class="btn btn-secondary">Cancel</button>
                            <button @click="executeParameterizedCmd" class="btn btn-primary">Execute</button>
                        </div>
                    </div>
                </div>

                <!-- Context Menu -->
                <div v-if="showContextMenu" :style="{'top':contextMenuY+'px','left':contextMenuX+'px'}" class="quick-cmd-context-menu" @mouseleave="showContextMenu = false" @mousedown.stop @click.stop>
                    <div @click="editCommand(contextMenuCmd)" class="quick-cmd-context-menu-item">
                        Edit
                    </div>
                    <div @click="deleteCommand(contextMenuCmd)" class="quick-cmd-context-menu-item quick-cmd-context-menu-danger">
                        Delete
                    </div>
                </div>

                <!-- Resize Handle -->
                <div v-show="!minimized" id="resize-handle" class="quick-cmd-resize-handle" @mousedown="startResize"></div>
            </div>
        `
        this.div = div
        this.restoreGeometry()

        // Toggle the panel with the configurable "Show/hide QuickCmdBtn" hotkey.
        this.subscriptions.push(this.hotkeys.hotkey$.subscribe(id => {
            if (id === 'toggle-quick-cmd-btn') {
                this.toggle()
            }
        }))

        let thisVar = this

        console.log('✓ templateHTML defined, length:', templateHTML.length)
        console.log('✓ First 200 chars:', templateHTML.substring(0, 200))
        console.log('✓ #app div found:', !!document.getElementById('app'))
        console.log('✓ About to create Vue app...')

        const appConfig = {
            template: templateHTML,
            mounted: function(){
                console.log('✓ Vue app mounted successfully!')
                console.log('✓ Vue component this:', !!this)
                console.log('✓ template rendered, tabToCmds:', Object.keys(this.tabToCmds).length)
                if (this.$refs.cmdTabs && Object.keys(this.tabToCmds).length > 0) {
                    this.$refs.cmdTabs.selectTab("#"+Object.keys(this.tabToCmds)[0])
                }
            },
            data() {
                let vueThis = this
                const updateUI = () => {
                    const tabToCmds = vueThis.updateCmds();
                    if (vueThis.$refs && vueThis.$refs.cmdTabs && Object.keys(tabToCmds).length > 0) {
                        vueThis.$refs.cmdTabs.selectTab("#" + Object.keys(tabToCmds)[0])
                    }
                    vueThis.tabToCmds = tabToCmds
                    vueThis.isTabVisible = vueThis.getIsVisible()
                    vueThis.isUseSystemTheme = vueThis.getIsUseSystemTheme()
                    vueThis.cmds = vueThis.getCmds()
                }

                const sub1 = thisVar.config.ready$.subscribe(() => {
                    updateUI()
                });
                const sub2 = thisVar.config.changed$.subscribe(() => {
                    updateUI()
                })
                thisVar.subscriptions.push(sub1, sub2)
                return {
                    tabToCmds: this.updateCmds(),
                    isTabVisible: this.getIsVisible(),
                    isUseSystemTheme: this.getIsUseSystemTheme(),
                    cmds: this.getCmds(),
                    showDialog: false,
                    editingExistingCommand: false,
                    editingCmdRef: null,
                    showParameterDialog: false,
                    parameterFields: [],
                    pendingCmd: null,
                    pendingEditBeforeSend: false,
                    showContextMenu: false,
                    contextMenuX: 0,
                    contextMenuY: 0,
                    contextMenuCmd: null,
                    editBeforeSend: false,
                    minimized: false,
                    tabsCollapsed: false,
                    newCmd: {
                        name: '',
                        text: '',
                        description: '',
                        group: 'default',
                        appendCR: true,
                    },
                }
            },
            methods: {
                sendCmd(cmd) {
                    const parameterNames = thisVar.extractParameterNames(cmd.text)
                    if (parameterNames.length === 0) {
                        thisVar.sendCmdToFocusTab(cmd, this.editBeforeSend)
                        return
                    }

                    this.parameterFields = parameterNames.map(name => ({ name, value: '' }))
                    this.pendingCmd = { ...cmd }
                    this.pendingEditBeforeSend = this.editBeforeSend
                    this.showParameterDialog = true
                    this.showContextMenu = false
                },
                cancelParameterDialog() {
                    this.showParameterDialog = false
                    this.parameterFields = []
                    this.pendingCmd = null
                    this.pendingEditBeforeSend = false
                },
                executeParameterizedCmd() {
                    if (!this.pendingCmd) {
                        this.cancelParameterDialog()
                        return
                    }

                    let resolvedText = this.pendingCmd.text
                    for (const parameter of this.parameterFields) {
                        resolvedText = thisVar.replaceParameter(resolvedText, parameter.name, parameter.value)
                    }

                    const resolvedCmd = { ...this.pendingCmd, text: resolvedText }
                    const editBeforeSend = this.pendingEditBeforeSend
                    this.cancelParameterDialog()
                    thisVar.sendCmdToFocusTab(resolvedCmd, editBeforeSend)
                },
                toggleMinimized() {
                    this.minimized = !this.minimized
                    if (thisVar.div) {
                        thisVar.div.classList.toggle('is-minimized', this.minimized)
                    }
                },
                handleTabHeaderClick(event) {
                    const target = event.target as HTMLElement
                    const tabLink = target.closest('.tabs-component-tab-a') as HTMLElement
                    if (!tabLink) {
                        return
                    }
                    const tab = tabLink.closest('.tabs-component-tab') as HTMLElement
                    const isActive = !!tab && tab.classList.contains('is-active')

                    if (isActive && !this.tabsCollapsed) {
                        event.preventDefault()
                        event.stopPropagation()
                        this.tabsCollapsed = true
                        return
                    }

                    this.tabsCollapsed = false
                },
                showCreateCommandDialog() {
                    this.newCmd = {
                        name: '',
                        text: '',
                        description: '',
                        group: 'default',
                        appendCR: true,
                    }
                    this.editingExistingCommand = false
                    this.editingCmdRef = null
                    this.showDialog = true
                    this.showContextMenu = false
                },
                closeDialog() {
                    this.showDialog = false
                    this.editingExistingCommand = false
                    this.editingCmdRef = null
                },
                saveCommand() {
                    if (!this.newCmd.name || !this.newCmd.text) {
                        alert('Name and command text are required')
                        return
                    }
                    const cmds = thisVar.ensureQcCmds()
                    const values = {
                        name: this.newCmd.name,
                        text: this.newCmd.text,
                        description: this.newCmd.description || '',
                        group: this.newCmd.group || 'default',
                        appendCR: this.newCmd.appendCR,
                    }
                    // When editing, update the exact command object being edited
                    // (tracked by reference) so renaming it works and commands
                    // that share a name are not confused for one another.
                    const editIndex = this.editingExistingCommand && this.editingCmdRef
                        ? cmds.indexOf(this.editingCmdRef)
                        : -1
                    if (editIndex >= 0) {
                        cmds[editIndex] = { ...cmds[editIndex], ...values }
                    } else {
                        cmds.push(values)
                    }
                    thisVar.config.save()
                    this.closeDialog()
                },
                openCmdContextMenu(event, cmd) {
                    event.preventDefault()
                    this.contextMenuX = event.clientX
                    this.contextMenuY = event.clientY
                    this.contextMenuCmd = cmd
                    this.showContextMenu = true
                },
                editCommand(cmd) {
                    this.newCmd = { ...cmd }
                    this.editingExistingCommand = true
                    this.editingCmdRef = cmd
                    this.showContextMenu = false
                    this.showDialog = true
                },
                deleteCommand(cmd) {
                    if (confirm('Delete command: ' + cmd.name + '?')) {
                        const cmds = thisVar.qcCmds
                        const index = cmds.indexOf(cmd) >= 0 ? cmds.indexOf(cmd) : cmds.findIndex(c => c.name === cmd.name)
                        if (index >= 0) {
                            cmds.splice(index, 1)
                            thisVar.config.save()
                        }
                    }
                    this.showContextMenu = false
                },
                showSettings() {
                    console.log('Settings clicked')
                },
                updateCmds() {
                    const tabToCmds: { [key: string]: any } = {};
                    for (let element of thisVar.qcCmds) {
                        if (!tabToCmds.hasOwnProperty(element.group)) {
                            tabToCmds[element.group] = []
                        }
                        tabToCmds[element.group].push(element)
                    }
                    return tabToCmds
                },
                getIsVisible() {
                    var isTabVisible = null
                    if (thisVar.config.store && thisVar.config.store.quickCmdBtnPlugin) {
                        isTabVisible = !thisVar.config.store.quickCmdBtnPlugin.disableTabs
                    }
                    return isTabVisible
                },
                getIsUseSystemTheme() {
                    var isUseSystemTheme = null
                    if (thisVar.config.store && thisVar.config.store.quickCmdBtnPlugin) {
                        isUseSystemTheme = !thisVar.config.store.quickCmdBtnPlugin.useSystemTheme
                    }
                    return isUseSystemTheme
                },
                getCmds() {
                    return [...thisVar.qcCmds]
                },
                closePanel() {
                    // Hide rather than destroy: the service is built once at
                    // startup, so destroying would make the panel unrecoverable
                    // until Tabby restarts. The toggle hotkey/menu brings it back.
                    thisVar.hide()
                },
                startResize(e) {
                    e.preventDefault()
                    const div = thisVar.div
                    const startX = e.clientX
                    const startY = e.clientY
                    const startWidth = div.offsetWidth
                    const startHeight = div.offsetHeight

                    const onMouseMove = (event) => {
                        const newWidth = Math.max(300, startWidth + (event.clientX - startX))
                        const newHeight = Math.max(100, startHeight + (event.clientY - startY))
                        div.style.width = newWidth + 'px'
                        div.style.height = newHeight + 'px'
                        div.style.maxHeight = newHeight + 'px'
                    }

                    const onMouseUp = () => {
                        document.removeEventListener('mousemove', onMouseMove)
                        document.removeEventListener('mouseup', onMouseUp)
                        thisVar.saveGeometry()
                    }

                    document.addEventListener('mousemove', onMouseMove)
                    document.addEventListener('mouseup', onMouseUp)
                }
            }
        }
        this.app = createApp(appConfig)
        this.app.component('tabs', Tabs)
        .component('tab', Tab)
        .mount('#app');

        console.log('✓ Vue app.mount() called')
        setTimeout(() => {
            const headerEl = document.getElementById('app-parent-header')
            const finalAppEl = document.getElementById('app')
            const finalAppParentEl = document.getElementById('app-parent')
            console.log('✓ After Vue mount:')
            console.log('#app element:', !!finalAppEl)
            if (finalAppEl) console.log('#app innerHTML length:', finalAppEl.innerHTML.length)
            console.log('#app-parent-header element:', !!headerEl)
            console.log('#app-parent element:', !!finalAppParentEl)
            if (finalAppParentEl) {
                const style = window.getComputedStyle(finalAppParentEl)
                console.log('display:', style.display)
                console.log('visibility:', style.visibility)
                console.log('opacity:', style.opacity)
                console.log('width:', style.width)
                console.log('height:', style.height)
            }
        }, 500)

        dragElement(document.getElementById("app-parent"));

        function dragElement(element) {
            let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
            if (document.getElementById(element.id + "-header")) {
                document.getElementById(element.id + "-header").onmousedown = dragMouseDown;
            } else {
                element.onmousedown = dragMouseDown;
            }

            function dragMouseDown(e) {
                if(e.target.tagName === "BUTTON" || e.target.tagName === "A" || e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "LABEL") {
                    return;
                }
                if(e.target.closest('.tabs-component-tab') || e.target.closest('.tabs-component-panels')) {
                    return;
                }
                e = e || window.event;
                e.preventDefault();
                pos3 = e.clientX;
                pos4 = e.clientY;
                document.onmouseup = closeDragElement;
                document.onmousemove = elementDrag;
            }

            function elementDrag(e) {
                e = e || window.event;
                e.preventDefault();
                pos1 = pos3 - e.clientX;
                pos2 = pos4 - e.clientY;
                pos3 = e.clientX;
                pos4 = e.clientY;
                let newTop = element.offsetTop - pos2;
                let newLeft = element.offsetLeft - pos1;
                const maxTop = window.innerHeight - 40;
                const maxLeft = window.innerWidth - 80;
                newTop = Math.max(0, Math.min(newTop, maxTop));
                newLeft = Math.max(-(element.offsetWidth - 80), Math.min(newLeft, maxLeft));
                element.style.top = newTop + "px";
                element.style.left = newLeft + "px";
                element.style.right = "auto";
            }

            function closeDragElement() {
                document.onmouseup = null;
                document.onmousemove = null;
                thisVar.saveGeometry();
            }
        }
    }

    extractParameterNames(text: string): string[] {
        const regex = /\$\{(.*?)\}/g
        const names: string[] = []
        const seen = new Set<string>()
        let match: RegExpExecArray | null

        while ((match = regex.exec(text)) !== null) {
            const name = match[1]
            if (!seen.has(name)) {
                seen.add(name)
                names.push(name)
            }
        }
        return names
    }

    replaceParameter(text: string, name: string, value: string): string {
        return text.split(`\${${name}}`).join(value)
    }

    sendCmdToFocusTab(cmd, editBeforeSend = false) {
        for (let tab of this.tabs) {
            if (tab.hasFocus) {
                const appendCR = editBeforeSend ? false : cmd.appendCR
                tab.sendInput(cmd.text + (appendCR ? "\r" : ""))
            }
        }
    }
    
    addTab (tab: any) {
        this.tabs.push(tab)
    }

    removeTab (tab: any) {
        const index = this.tabs.indexOf(tab)
        if (index >= 0) {
            this.tabs.splice(index, 1)
        }
    }

    show () {
        if (this.div) {
            this.div.style.display = ''
        }
        this.visible = true
    }

    hide () {
        if (this.div) {
            this.div.style.display = 'none'
        }
        this.visible = false
    }

    toggle () {
        if (this.visible) {
            this.hide()
        } else {
            this.show()
        }
    }

    private get pluginStore (): any {
        if (!this.config.store || !this.config.store.quickCmdBtnPlugin) {
            return null
        }
        return this.config.store.quickCmdBtnPlugin
    }

    private saveGeometry () {
        const store = this.pluginStore
        if (!this.div || !store) {
            return
        }
        store.panel = {
            top: this.div.offsetTop,
            left: this.div.offsetLeft,
            width: this.div.offsetWidth,
            height: this.div.offsetHeight,
        }
        this.config.save()
    }

    private restoreGeometry () {
        const store = this.pluginStore
        const panel = store && store.panel
        if (!this.div || !panel) {
            return
        }
        this.div.style.top = panel.top + 'px'
        this.div.style.left = panel.left + 'px'
        this.div.style.right = 'auto'
        this.div.style.width = panel.width + 'px'
        this.div.style.height = panel.height + 'px'
        this.div.style.maxHeight = panel.height + 'px'
    }

    private cleanup() {
        for (const subscription of this.subscriptions) {
            subscription.unsubscribe()
        }
        this.subscriptions = []

        if (this.app) {
            this.app.unmount()
            this.app = null
        }

        if (this.div && this.div.parentNode) {
            this.div.parentNode.removeChild(this.div)
            this.div = null
        }

        this.tabs = []
    }
}