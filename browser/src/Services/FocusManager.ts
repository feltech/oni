/*
 * FocusManager.ts
 */

import * as _ from "lodash"
import * as Log from "oni-core-logging"

class FocusManager {
    private _focusElementStack: HTMLElement[] = []

    public get focusedElement(): HTMLElement | null {
        return this._focusElementStack.length > 0 ? this._focusElementStack[0] : null
    }

    public pushFocus(element: HTMLElement) {
        // Remove any previous entry in the stack.
        this._popFocus(element)
        // Check if this element or the currently focussed element is a modal-type menu.
        const elIsMenu = isMenu(element)
        const currentIsMenu = isMenu(this.focusedElement)

        if (elIsMenu || !currentIsMenu) {
            // Either this is a menu element, or it isn't and no menus are open, so put on top
            // of stack.
            this._focusElementStack.unshift(element)
        } else {
            // A menu is open, so push "underneath" the menu in the stack.
            const idx = _.findLastIndex(this._focusElementStack, el => isMenu(el))
            this._focusElementStack.splice(idx + 1, 0, element)
        }

        window.setTimeout(() => this.enforceFocus(), 0)
    }

    public popFocus(element: HTMLElement) {
        this._popFocus(element)
        this.enforceFocus()
    }

    public enforceFocus(): void {
        // Clean the focus stack of elements that no longer exist (e.g. after a re-render
        // following alt-tabbing away).
        const removed = _.remove(this._focusElementStack, el => !el.offsetParent)
        Log.debug(`Removed ${removed.length} destroyed elements from focus stack`)

        if (this._focusElementStack.length === 0) {
            return
        }

        const activeElement = this._focusElementStack[0]
        if (activeElement !== document.activeElement) {
            activeElement.focus()
        }
    }

    private _popFocus(element: HTMLElement) {
        this._focusElementStack = this._focusElementStack.filter(elem => elem !== element)
    }
}

function isMenu(el: HTMLElement) {
    return el && el.offsetParent && el.offsetParent.classList.contains("menu")
}
export const focusManager = new FocusManager()
