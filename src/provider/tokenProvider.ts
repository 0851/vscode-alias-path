import fs from 'fs';
import {
  ExtensionContext,
  window,
  TextEditor,
  workspace,
  Position
} from 'vscode';
import { debounce, getDepends, getFileMBSize, getRealPaths } from '../util';
import tryCssTokens from '../util/parser/css'
import tryTypescriptTokens from '../util/parser/typescript'

export class TokenModel {
  tokens: TokenItem[] = []
  constructor(
    public filepath: string,
    public type: 'typescript' | 'css',
    public getPosition: (node: any) => {
      start: Position,
      end: Position,
      startOffset: number,
      endOffset: number,
    }) {

  }
  add(node: any, keyword: string) {
    const token: TokenItem = {
      filepath: this.filepath,
      keyword,
      node: node,
      type: this.type,
      ...this.getPosition(node)
    }
    const find = this.tokens.find(item => item.startOffset === token.startOffset)
    if (find) {
      return
    }
    this.tokens.push(token);
  }
}
export function getTokens(filepath: string,
  config: {
    maxfsmbsize: number,
    importDefaultName?: string
  }): TokenItem[] {
  if (!fs.existsSync(filepath)
    || !fs.statSync(filepath).isFile()) {
    return []
  }
  const fsmbsize = getFileMBSize(filepath);

  if (fsmbsize > config.maxfsmbsize) {
    return [];
  }

  const content = fs.readFileSync(filepath, 'utf-8');

  const tokens = [
    ...tryTypescriptTokens(filepath, content, config.importDefaultName),
    ...tryCssTokens(filepath, content, config.importDefaultName)
  ];

  return tokens
}

export class AliasPathTokensProvider implements TokenProvider {
  configProvider: ConfigProvider
  tokens: TokenItem[]

  constructor(public context: ExtensionContext, config: {
    configProvider: ConfigProvider,
  }) {
    this.context = context;
    this.configProvider = config.configProvider;
    this.tokens = [];
    this.activate();
  }
  activate() {
    const debounceGenTokens = debounce(this.genTokens.bind(this), 500);
    window.onDidChangeActiveTextEditor((e: TextEditor | undefined) => {
      debounceGenTokens.cancel();
      debounceGenTokens(e)
    })
    debounceGenTokens(window.activeTextEditor)
  }
  genTokens(e: TextEditor | undefined) {
    try {
      const document = e?.document;
      this.tokens = [];
      if (!document) return;
      const rootUri = workspace.getWorkspaceFolder(document.uri)?.uri;
      const content = document.getText();
      const depends = getDepends(content);
      const config = this.configProvider.getConfig(document.uri)
      const dependsPaths: DependPathItem[] = [{
        filepath: document.uri.fsPath,
      }];
      depends.forEach(dep => {
        dependsPaths.push(...getRealPaths(
          dep.filepath,
          {
            ...config,
            rootUri: rootUri,
            relativeUri: document.uri,
            importDefaultName: dep.importDefaultName
          }
        ))
      })
      let tokens: TokenItem[] = []
      dependsPaths.forEach(realpathitem => {
        tokens.push(...getTokens(
          realpathitem.filepath,
          {
            maxfsmbsize: config.maxDependFileSize || 2,
            importDefaultName: realpathitem.importDefaultName
          }
        ));
      })
      this.tokens = tokens;
    } catch (e) {

    }
  }
  deactivate() {
    this.tokens = [];
  }
}