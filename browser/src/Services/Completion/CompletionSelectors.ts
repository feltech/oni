/**
 * CompletionSelectors.ts
 *
 * Selectors are functions that take a state and derive a value from it.
 */
import * as _ from "lodash"

import { ICompletionState } from "./CompletionState"

import * as types from "vscode-languageserver-types"

const EmptyCompletions: types.CompletionItem[] = []

import * as CompletionUtility from "./CompletionUtility"

export const getFilteredCompletions = (state: ICompletionState): types.CompletionItem[] => {
    if (!state.completionResults.completions || !state.completionResults.completions.length) {
        return EmptyCompletions
    }

    if (!state.meetInfo.shouldExpand) {
        return EmptyCompletions
    }

    // If the completions were for a different meet line/position, we probably
    // shouldn't show them...
    if (
        state.meetInfo.meetLine !== state.completionResults.meetLine ||
        state.meetInfo.meetPosition !== state.completionResults.meetPosition
    ) {
        return EmptyCompletions
    }

    // If we had previously accepted this completion, don't show it either
    if (
        state.meetInfo.meetLine === state.lastCompletionInfo.meetLine &&
        state.meetInfo.meetPosition === state.lastCompletionInfo.meetPosition &&
        state.meetInfo.meetBase ===
            CompletionUtility.getInsertText(state.lastCompletionInfo.completion)
    ) {
        return EmptyCompletions
    }

    const completions = state.completionResults.completions

    const filteredCompletions = filterCompletionOptions(completions, state.meetInfo.meetBase)

    if (!filteredCompletions || !filteredCompletions.length) {
        return EmptyCompletions
    }

    // If there is only one element, and it matches our base,
    // don't bother showing it..
    if (
        CompletionUtility.getInsertText(filteredCompletions[0]) === state.meetInfo.meetBase &&
        filteredCompletions.length === 1
    ) {
        return EmptyCompletions
    }

    return filteredCompletions
}

export const filterCompletionOptions = (
    items: types.CompletionItem[],
    searchText: string,
): types.CompletionItem[] => {
    // Language servers can return duplicate entries (e.g. cquery).
    const uniqueItems: types.CompletionItem[] = _.uniqWith(
        items,
        (item1: types.CompletionItem, item2: types.CompletionItem) => {
            // Strip sortText as it's usually different, even if all other attributes are identical.
            const item1WithoutSortText = _.omit(item1, "sortText")
            const item2WithoutSortText = _.omit(item2, "sortText")
            return _.isEqual(item1WithoutSortText, item2WithoutSortText)
        },
    )
    if (!searchText) {
        return uniqueItems
    }
    if (!items || !items.length) {
        return null
    }

    // Must start with first letter in searchText, and then be at least abbreviated by searchText.
    const filterRegEx = new RegExp("^" + searchText.split("").join(".*") + ".*")
    const filteredOptions = uniqueItems.filter(f => {
        const textToFilterOn = f.filterText || f.label
        return textToFilterOn.match(filterRegEx)
    })
    const sortedOptions = filteredOptions.sort((itemA, itemB) => {
        const itemASortText = itemA.filterText || itemA.label
        const itemBSortText = itemB.filterText || itemB.label

        const indexOfA = itemASortText.indexOf(searchText)
        const indexOfB = itemBSortText.indexOf(searchText)

        // Ensure abbreviated matches are sorted below exact matches.
        if (indexOfA >= 0 && indexOfB === -1) {
            return -1
        } else if (indexOfA === -1 && indexOfB >= 0) {
            return 1
            // Else sort by label to keep related results together.
        } else if (itemASortText < itemBSortText) {
            return -1
        } else if (itemASortText > itemBSortText) {
            return 1
            // Otherwise sort by language server -specified sortText.
        } else if (itemA.sortText < itemB.sortText) {
            return -1
        } else if (itemA.sortText > itemB.sortText) {
            return 1
        }
        return 0
    })

    return sortedOptions
}
