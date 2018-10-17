/**
 * CompletionUtility.ts
 *
 * Helper functions for auto completion
 */
import * as escapeRegExp from "lodash/escapeRegExp"
import * as memoize from "lodash/memoize"

import * as Oni from "oni-api"
import * as types from "vscode-languageserver-types"

import { SnippetManager } from "./../Snippets"

export const commitCompletion = async (
    buffer: Oni.Buffer,
    line: number,
    base: number,
    completion: types.CompletionItem,
    snippetManager?: SnippetManager,
) => {
    const currentLines = await buffer.getLines(line, line + 1)

    const column = buffer.cursor.column

    if (!currentLines || !currentLines.length) {
        return
    }

    const originalLine = currentLines[0]

    const isSnippet =
        completion.insertTextFormat === types.InsertTextFormat.Snippet && snippetManager

    // If it's a snippet, we don't insert any text - we'll let the insert manager handle that.
    const textToReplace = isSnippet ? "" : getInsertText(completion)

    const newLine = replacePrefixWithCompletion(originalLine, base, column, textToReplace)
    await buffer.setLines(line, line + 1, [newLine])
    const cursorOffset = newLine.length - originalLine.length
    await buffer.setCursorPosition(line, column + cursorOffset)

    if (isSnippet) {
        await snippetManager.insertSnippet(completion.insertText)
    }
}

export const getInsertText = (completionItem: types.CompletionItem): string => {
    return completionItem.insertText || completionItem.label
}

export function replacePrefixWithCompletion(
    bufferLine: string,
    basePosition: number,
    cursorColumn: number,
    completion: string,
): string {
    const startPosition = basePosition

    const before = bufferLine.substring(0, startPosition)
    const after = bufferLine.substring(cursorColumn, bufferLine.length)

    return before + completion + after
}

export interface CompletionMeetResult {
    // Position - where the meet starts
    position: number

    // PositionToQuery - where the query request should start
    positionToQuery: number

    // Base - the currentg prefix of the completion
    base: string

    // Whether or not completiosn should be expanded / queriried
    shouldExpandCompletions: boolean
}

/**
 * Returns the start of the 'completion meet' along with the current base for completion.
 *
 * If cursor is after a trigger character (e.g. `.`), then query server for completions at the
 * cursor position.  If the cursor is at the end of a (incomplete) word, query for completions
 * after the first character of that word. If the cursor is in the middle of a word, don't query.
 */
export function getCompletionMeet(
    line: string,
    cursorColumn: number,
    characterMatchRegex: RegExp,
    completionTriggerCharacters: string[],
): CompletionMeetResult {
    // Is there an alphanumeric character after the cursor position?
    const isCharacterAfterCursor =
        cursorColumn < line.length && line[cursorColumn].match(characterMatchRegex)
    const wordRegExp = _wordRegExp(characterMatchRegex.source)
    const triggerRegExp = _triggerRegExp(completionTriggerCharacters)
    const lineToCursor = line.slice(0, cursorColumn)
    const wordMatch = lineToCursor.match(wordRegExp)
    const triggerMatch = lineToCursor.match(triggerRegExp)

    const word = (wordMatch && wordMatch[0]) || ""
    const wordPos = (wordMatch && wordMatch.index) || cursorColumn

    return {
        position: wordPos,
        positionToQuery: triggerMatch ? cursorColumn : wordPos + 1,
        base: word,
        shouldExpandCompletions: !!((triggerMatch || wordMatch) && !isCharacterAfterCursor),
    }
}

const _wordRegExp = memoize((characterMatch: string) => {
    return new RegExp("(?:" + characterMatch + "+)$")
})

const _triggerRegExp = memoize((triggerCharacters: string[]) => {
    return new RegExp("(?:" + triggerCharacters.map(escapeRegExp).join("|") + ")$")
})

export const convertKindToIconName = (completionKind: types.CompletionItemKind) => {
    switch (completionKind) {
        case types.CompletionItemKind.Class:
            return "cube"
        case types.CompletionItemKind.Color:
            return "paint-brush"
        case types.CompletionItemKind.Constructor:
            return "building"
        case types.CompletionItemKind.Enum:
            return "sitemap"
        case types.CompletionItemKind.Field:
            return "var"
        case types.CompletionItemKind.File:
            return "file"
        case types.CompletionItemKind.Function:
            return "cog"
        case types.CompletionItemKind.Interface:
            return "plug"
        case types.CompletionItemKind.Keyword:
            return "key"
        case types.CompletionItemKind.Method:
            return "flash"
        case types.CompletionItemKind.Module:
            return "cubes"
        case types.CompletionItemKind.Property:
            return "wrench"
        case types.CompletionItemKind.Reference:
            return "chain"
        case types.CompletionItemKind.Snippet:
            return "align-justify"
        case types.CompletionItemKind.Text:
            return "align-justify"
        case types.CompletionItemKind.Unit:
            return "tag"
        case types.CompletionItemKind.Value:
            return "lock"
        case types.CompletionItemKind.Variable:
            return "code"
        default:
            return "question"
    }
}
