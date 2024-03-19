import {
  DefinitionProvider,
  CancellationToken,
  TextDocument,
  ProviderResult,
  Position,
  Definition,
  DefinitionLink,
  ExtensionContext,
  Location,
  Uri,
  workspace
} from 'vscode'
import { getRealPaths, getDepends, hyphenToPascal, isExcluded } from '../util';

export class AliasPathDefinitionProvider implements DefinitionProvider {
  configProvider: ConfigProvider
  tokenProvider: TokenProvider
  constructor(public ctx: ExtensionContext, config: {
    configProvider: ConfigProvider,
    tokenProvider: TokenProvider
  }) {
    this.configProvider = config.configProvider;
    this.tokenProvider = config.tokenProvider;
  }
  provideDefinition(
    document: TextDocument,
    position: Position,
    token: CancellationToken): ProviderResult<Definition | DefinitionLink[]> {
    const regPath = /(['"])([^\1]+?)\1/;
    const range = document.getWordRangeAtPosition(position, regPath);
    const config = this.configProvider.getConfig(document.uri);

    if (isExcluded(document.uri.fsPath, config.excludeGlobs || [])) {
      return
    }
    if (range) {
      const inputPath = document.getText(range);
      const rootUri = workspace.getWorkspaceFolder(document.uri)?.uri
      const realPaths = getRealPaths(
        inputPath.slice(1, -1),
        {
          ...config,
          rootUri: rootUri,
          relativeUri: document.uri,
        }
      );
      return realPaths.map(realPathItem => {
        return new Location(
          Uri.file(realPathItem.filepath),
          new Position(0, 0)
        );
      })
    } else {
      return this.provideImportDefinition(document, position, token);
    }
  }
  provideImportDefinition(
    document: TextDocument,
    position: Position,
    token: CancellationToken): ProviderResult<Definition | DefinitionLink[]> {
    const regKeyWord = /[$_a-zA-Z]+[\w_-]*/;
    const range = document.getWordRangeAtPosition(position, regKeyWord);
    const rootUri = workspace.getWorkspaceFolder(document.uri)?.uri;

    if (!range) {
      return
    }

    const tokens = this.tokenProvider.tokens

    const content = document.getText();

    const previousCharOffset = document.offsetAt(range.start);

    const previousChar = content[previousCharOffset - 1];

    let normalized = document.getText(range);

    if (previousChar === '<') {
      normalized = hyphenToPascal(normalized)
    }

    const findTokens = tokens.filter(token => {
      return token.keyword === normalized;
    })

    if (findTokens) {
      return findTokens.map(token => {
        return new Location(
          Uri.file(token.filepath),
          token.start
        )
      })
    }

    const zeroBasedPosition = document.offsetAt(position);
    const depends = getDepends(content);
    const findDepend = depends.find(item => {
      return item.matchStart <= zeroBasedPosition && item.matchEnd >= zeroBasedPosition
    })

    if (findDepend) {
      const realPaths = getRealPaths(
        findDepend.filepath,
        {
          ...this.configProvider.getConfig(document.uri),
          rootUri: rootUri,
          relativeUri: document.uri,
        }
      );
      return realPaths.map(realPathItem => {
        return new Location(
          Uri.file(realPathItem.filepath),
          new Position(0, 0)
        );
      })
    }
  }
}