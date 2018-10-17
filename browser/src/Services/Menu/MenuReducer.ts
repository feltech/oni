/**
 * MenuReducer.ts
 *
 * Implements state-change logic for the menu
 */

import { filter } from "./Filter/FuseFilter"
import * as Actions from "./MenuActions"
import * as State from "./MenuState"

export function createReducer<T, FilteredT extends T>() {
    const reducer = (
        s: State.IMenus<T, FilteredT>,
        a: Actions.MenuAction,
    ): State.IMenus<T, FilteredT> => {
        return {
            ...s,
            configuration: configurationReducer(s.configuration, a),
            menu: popupMenuReducer(s.menu, a),
        }
    }

    const configurationReducer = (
        s: State.IMenuConfigurationSettings = State.DefaultMenuConfigurationSettings,
        a: Actions.MenuAction,
    ) => {
        switch (a.type) {
            case "SET_MENU_CONFIGURATION":
                return {
                    ...s,
                    rowHeight: a.payload.rowHeight,
                    maxItemsToShow: a.payload.maxItemsToShow,
                }
            default:
                return s
        }
    }

    function popupMenuReducer(
        s: State.IMenu<T, FilteredT> | null,
        a: any,
    ): State.IMenu<T, FilteredT> {
        // TODO: sync max display items (10) with value in Menu.render() (Menu.tsx)
        const size = s && s.filteredOptions ? s.filteredOptions.length : 0

        switch (a.type) {
            case "SHOW_MENU": {
                const options3 = a.payload.items || []
                const filterText = a.payload.filter || ""
                const filterFunc =
                    a.payload.options && a.payload.options.filterFunction
                        ? a.payload.options.filterFunction
                        : filter
                const filteredOptions3 = filterFunc(options3, filterText)
                return {
                    ...a.payload.options,
                    id: a.payload.id,
                    filter: filterText,
                    filterFunction: filterFunc,
                    filteredOptions: filteredOptions3,
                    options: options3,
                    selectedIndex: 0,
                    isLoading: false,
                }
            }
            case "SET_MENU_ITEMS": {
                if (!s || s.id !== a.payload.id) {
                    return s
                }

                const filterFunc = s.filterFunction
                const filteredOptions = filterFunc(a.payload.items, s.filter)
                // Ensure current selected item is within range of the newly filtered list.
                const selectedIndex = s.selectedIndex < filteredOptions.length ? s.selectedIndex : 0

                return {
                    ...s,
                    options: a.payload.items,
                    filteredOptions,
                    selectedIndex,
                }
            }
            case "SET_MENU_LOADING":
                if (!s || s.id !== a.payload.id) {
                    return s
                }

                return {
                    ...s,
                    isLoading: a.payload.isLoading,
                }
            case "HIDE_MENU":
                return null
            case "NEXT_MENU":
                return {
                    ...s,
                    selectedIndex: (s.selectedIndex + 1) % size,
                }
            case "PREVIOUS_MENU":
                return {
                    ...s,
                    selectedIndex: s.selectedIndex > 0 ? s.selectedIndex - 1 : size - 1,
                }
            case "FILTER_MENU": {
                if (!s) {
                    return s
                }

                // Note that for language server completions, the `filterFunc` is a no-op - the
                // items are filtered elsewhere (but this FILTER_MENU action is still dispatched).
                const filterFunc = s.filterFunction
                const filteredOptionsSorted = filterFunc(s.options, a.payload.filter)

                return {
                    ...s,
                    filter: a.payload.filter,
                    filteredOptions: filteredOptionsSorted,
                    selectedIndex: 0,
                }
            }
            default:
                return s
        }
    }

    return reducer
}
