/**
 * CompletionUtility.ts
 *
 * Helper functions for auto completion
 */
import * as _ from "lodash"

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

export function getCompletionStart(
    bufferLine: string,
    cursorColumn: number,
    completion: string,
): number {
    cursorColumn = Math.min(cursorColumn, bufferLine.length)

    let x = cursorColumn
    while (x >= 0) {
        const subWord = bufferLine.substring(x, cursorColumn + 1)

        if (completion.indexOf(subWord) === -1) {
            break
        }

        x--
    }

    return x + 1
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

export const doesCharacterMatchTriggerCharacters = (
    character: string,
    triggerCharacters: string[],
): boolean => {
    triggerCharacters = triggerCharacters.map((word)=>word[word.length-1]) // Only final character
    return triggerCharacters.indexOf(character) >= 0
}

/**
 * Returns the start of the 'completion meet' along with the current base for completion
 */
export function getCompletionMeet(
    line: string,
    cursorColumn: number,
    characterMatchRegex: RegExp,
    completionTriggerCharacters: string[],
): CompletionMeetResult {
    // Clamp column to within string bounds
    let col = Math.max(cursorColumn - 1, 0)
    col = Math.min(col, line.length - 1)

    let currentPrefix = ""

    // `col` is last whitespace preceding word to complete, or is trigger
    while (col >= 0 && col < line.length) {
        const currentCharacter = line[col]

        if (
            !currentCharacter.match(characterMatchRegex) ||
            doesCharacterMatchTriggerCharacters(currentCharacter, completionTriggerCharacters)
        ) {
            break
        }

        // `currentPrefix` is word to complete
        currentPrefix = currentCharacter + currentPrefix
        col--
    }

    // `basePos` is first character in word to complete, or next character after trigger
    const basePos = col + 1

    const isFromTriggerCharacter = doesCharacterMatchTriggerCharacters(
        line[basePos - 1],
        completionTriggerCharacters,
    )

    // Is there an alphanumeric character after the cursor position?
    const isCharacterAfterCursor =
        cursorColumn < line.length && line[cursorColumn].match(characterMatchRegex)

    // Is the cursor currently at the end of a word/trigger?
    const shouldExpandCompletions =
        (currentPrefix.length > 0 || isFromTriggerCharacter) && !isCharacterAfterCursor

    // If trigger character, complete space immediately after it, otherwise complete from second
    // character in word.
    const positionToQuery = isFromTriggerCharacter ? basePos : basePos + 1

    let oldAlg = {
        position: basePos,
        positionToQuery,
        base: currentPrefix,
        shouldExpandCompletions,
    }

    const wordRegExp = new RegExp(
        "(?:" + characterMatchRegex.source + "+)$"
    )
    const triggerRegExp = new RegExp(
        "(?:" + completionTriggerCharacters.map(_.escapeRegExp).join("|") + ")$"
    )
    const lineToCursor = line.slice(0, cursorColumn)
    const wordMatch = lineToCursor.match(wordRegExp)
    const triggerMatch = lineToCursor.match(triggerRegExp)

    const word = wordMatch && wordMatch[0] || ""
    const wordPos = wordMatch && wordMatch.index || cursorColumn

    let newAlg = {
        position: wordPos,
        positionToQuery: triggerMatch ? cursorColumn : wordPos,
        base: word,
        shouldExpandCompletions: !!(
            (triggerMatch || wordMatch) && !isCharacterAfterCursor
        )
    }

    console.log("OLD: " + JSON.stringify(oldAlg) + "\n" + "NEW: " + JSON.stringify(newAlg))

    return newAlg
}

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
