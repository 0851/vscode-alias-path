import fs from 'fs';
import {
  ExtensionContext,
  window,
  TextEditor,
  workspace
} from 'vscode';
import { debounce, getDepends, getFileMBSize, getRealPaths } from '../util';
import tryCssTokens from '../util/parser/css'
import tryTypescriptTokens from '../util/parser/typescript'

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
    const document = e?.document;
    this.tokens = [];
    if (!document) return;
    const rootUri = workspace.getWorkspaceFolder(document.uri)?.uri;
    const content = document.getText();
    const depends = getDepends(content);
    const config = this.configProvider.getConfig(document.uri)
    const dependsPaths: DependPathItem[] = [];
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
  }
  deactivate() {
    this.tokens = [];
  }
}