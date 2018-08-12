/*
 * FocusManager.ts
 */

import * as Log from "oni-core-logging"

class FocusManager {
    private _focusElementStack: HTMLElement[] = []
    private _modalElementStack: HTMLElement[] = []

    public get focusedElement(): HTMLElement | null {
        return this._focusElementStack.length > 0 ? this._focusElementStack[0] : null
    }

    public pushModal(element: HTMLElement) {
        this._modalElementStack = [element, ...this._modalElementStack]

        window.setTimeout(() => this.enforceFocus(), 0)
    }

    public popModal(element: HTMLElement) {
        this._modalElementStack = this._modalElementStack.filter(elem => elem !== element)

        this.enforceFocus()
    }

    public pushFocus(element: HTMLElement) {
        this._focusElementStack = [element, ...this._focusElementStack]

        window.setTimeout(() => this.enforceFocus(), 0)
    }

    public popFocus(element: HTMLElement) {
        this._focusElementStack = this._focusElementStack.filter(elem => elem !== element)

        this.enforceFocus()
    }

    public setFocus(element: HTMLElement): void {
        if (element) {
            this._focusElementStack = [element]
            this.enforceFocus()
        } else {
            Log.warn("FocusManager.setFocus called with null element")
        }
    }

    public enforceFocus(): void {
        if (this._focusElementStack.length === 0) {
            return
        }

        const activeElement = this._modalElementStack.length
            ? this._modalElementStack[0]
            : this._focusElementStack[0]

        if (activeElement !== document.activeElement) {
            activeElement.focus()
        }
    }
}

export const focusManager = new FocusManager()
