import { snippetCompletion, completeFromList } from '@codemirror/autocomplete'
import type { CompletionContext, Completion } from '@codemirror/autocomplete'
import { scopeCompletionSource, localCompletionSource, snippets } from '@codemirror/lang-javascript'

export const getCompletions = () => {
  const snippetsCompletions: Completion[] = [
    /**
     * Built-In
     */
    ...snippets,
    /**
     * Others
     */
    snippetCompletion('console.log(`[$\\{name\\}]`, ${})', {
      label: 'log',
      type: 'keyword',
    }),
  ]

  const completions = [
    /**
     * Global methods
     */
    scopeCompletionSource({ ...window }),
    /**
     * Code Snippets
     */
    completeFromList(snippetsCompletions),
    /**
     * Locally Defined
     */
    (context: CompletionContext) => {
      const word = context.matchBefore(/\w*/)
      if (!word || context.explicit) return null

      const codeCompletion = localCompletionSource(context) || { options: [] }

      return {
        from: word.from,
        options: codeCompletion.options,
      }
    },
  ]

  return completions
}
