/* global:clock */
import * as assert from "assert"
import * as sinon from "sinon"

import { focusManager } from "../../src/Services/FocusManager"

// tslint:disable-next-line no-string-literal
const clock: any = global["clock"]

describe("FocusManager", () => {
    let sandbox: sinon.SinonSandbox

    beforeEach(() => {
        sandbox = sinon.sandbox.create()
    })
    afterEach(() => {
        sandbox.restore()
        // tslint:disable-next-line no-string-literal
        focusManager["_focusElementStack"] = []
    })

    describe("push/pop", () => {
        let enforceFocus: sinon.SinonStub
        beforeEach(() => {
            enforceFocus = sandbox.stub(focusManager, "enforceFocus")
        })

        describe("push", () => {
            const assertEnforcesFocus = () => {
                sinon.assert.notCalled(enforceFocus)
                clock.tick(0)
                sinon.assert.calledOnce(enforceFocus)
                sinon.assert.calledWithExactly(enforceFocus)
            }

            describe("pushFocus", () => {
                it("prepends element to the stack and ensures it's focused", () => {
                    const elNew = "elNew" as any
                    const elPrev = "elPrev" as any
                    // tslint:disable-next-line no-string-literal
                    focusManager["_focusElementStack"] = [elPrev]

                    focusManager.pushFocus(elNew)

                    // tslint:disable-next-line no-string-literal
                    assert.deepStrictEqual(focusManager["_focusElementStack"], [elNew, elPrev])
                    assertEnforcesFocus()
                })
            })
            describe("pushModal", () => {
                it("prepends element to the stack and ensures it's focused", () => {
                    const elNew = "elNew" as any
                    const elPrev = "elPrev" as any
                    // tslint:disable-next-line no-string-literal
                    focusManager["_modalElementStack"] = [elPrev]

                    focusManager.pushFocus(elNew)

                    // tslint:disable-next-line no-string-literal
                    assert.deepStrictEqual(focusManager["_modalElementStack"], [elNew, elPrev])
                    assertEnforcesFocus()
                })
            })
        })

        describe("pop", () => {
            describe("popFocus", () => {
                it("removes element from the stack and enforces focus", () => {
                    const elNew = "elNew" as any
                    const elPrev = "elPrev" as any
                    // tslint:disable-next-line no-string-literal
                    focusManager["_focusElementStack"] = [elNew, elPrev]

                    focusManager.popFocus(elNew)

                    // tslint:disable-next-line no-string-literal
                    assert.deepStrictEqual(focusManager["_focusElementStack"], [elPrev])
                    assert.ok(enforceFocus.calledWithExactly())
                })
            })
            describe("popModal", () => {
                it("removes element from the stack and enforces focus", () => {
                    const elNew = "elNew" as any
                    const elPrev = "elPrev" as any
                    // tslint:disable-next-line no-string-literal
                    focusManager["_modalElementStack"] = [elNew, elPrev]

                    focusManager.popFocus(elNew)

                    // tslint:disable-next-line no-string-literal
                    assert.deepStrictEqual(focusManager["_modalElementStack"], [elPrev])
                    assert.ok(enforceFocus.calledWithExactly())
                })
            })
        })
    })
})
