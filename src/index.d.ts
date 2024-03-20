declare type Config = Partial<{
  activeLanguages: import('vscode').DocumentSelector,
  alias: Record<string, string>
  allowedIgnoreExt: string[]
  cssTokenExt: string[]
  jsTokenExt: string[]
  excludeGlobs: string[]
  autoSuggestion: boolean
  maxDependFileSize: number
}>

declare type DependItem = {
  matchString: string,
  matchStart: number,
  matchEnd: number,
  filepath: string,
  importDefaultName?: string
}
declare type DependPathItem = {
  filepath: string,
  importDefaultName?: string
}
declare type TokenItem = {
  filepath: string,
  keyword: string,
  startOffset: number,
  endOffset: number,
  start: import('vscode').Position
  end: import('vscode').Position
  node: any
  type: 'typescript' | 'css'
}
declare interface ConfigProvider {
  activate(): void
  deactivate(): void
  getConfig(uri: import('vscode').Uri): Config
}

declare interface TokenProvider {
  tokens: TokenItem[]
  activate(): void
  deactivate(): void
}
declare module 'vscode-alias-path' {
  export type AliasPathConfig = Config
}