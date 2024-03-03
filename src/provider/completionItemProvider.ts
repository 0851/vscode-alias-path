import {
  CancellationToken,
  TextDocument,
  ProviderResult,
  Position,
  ExtensionContext,
  CompletionItemProvider,
  CompletionContext,
  CompletionItem
} from 'vscode'

export const VueTokens = [
  "extend",
  "nextTick",
  "set",
  "delete",
  "directive",
  "filter",
  "component",
  "use",
  "mixin",
  "compile",
  "observable",
  "version",
  "data",
  "props",
  "propsData",
  "computed",
  "methods",
  "watch",
  "el",
  "template",
  "render",
  "renderError",
  "beforeCreate",
  "created",
  "beforeMounted",
  "mounted",
  "beforeUpdate",
  "updated",
  "activated",
  "deactivated",
  "beforeDestroy",
  "destroyed",
  "errorCaptured",
  "directives",
  "filters",
  "components",
  "parent",
  "mixins",
  "extends",
  "provide",
  "inject",
  "name",
  "delimiters",
  "functional",
  "model",
  "inheritAttrs",
  "comments",
  "$data",
  "$props",
  "$el",
  "$options",
  "$parent",
  "$root",
  "$children",
  "$slots",
  "$scopedSlots",
  "$refs",
  "$isServer",
  "$attrs",
  "$listeners",
  "$watch",
  "$set",
  "$delete",
  "$mount",
  "$forceUpdate",
  "$nextTick",
  "$destroy",
  "hook:beforeCreate",
  "hook:created",
  "hook:beforeMounted",
  "hook:mounted",
  "hook:beforeUpdate",
  "hook:updated",
  "hook:activated",
  "hook:deactivated",
  "hook:beforeDestroy",
  "hook:destroyed",
]

export class AliasPathCompletionItemProvider implements CompletionItemProvider {
  configProvider: ConfigProvider
  tokenProvider: TokenProvider
  constructor(public ctx: ExtensionContext, config: {
    configProvider: ConfigProvider,
    tokenProvider: TokenProvider
  }) {
    this.configProvider = config.configProvider;
    this.tokenProvider = config.tokenProvider;
  }
  provideCompletionItems(
    document: TextDocument,
    position: Position,
    token: CancellationToken,
    context: CompletionContext): ProviderResult<CompletionItem[]> {
    // console.log(token, '=====token====');
    const regKeyWord = /[$_a-zA-Z]+[\w_-]*/;
    const range = document.getWordRangeAtPosition(position, regKeyWord);
    const keyword = document.getText(range);
    const tokens = [
      ...this.tokenProvider.tokens.map(token => {
        return {
          keyword: token.keyword,
          detail: token.filepath
        }
      }),
      ...VueTokens.map(token => {
        return {
          keyword: token,
          detail: 'vue'
        }
      })
    ];
    const filteredTokens = tokens.filter(token => {
      return new RegExp(`${keyword}`, 'i').test(token.keyword)
    })
    return filteredTokens.map(token => {
      const item = new CompletionItem(token.keyword)
      item.documentation = item.detail;
      return item
    })
  }
}