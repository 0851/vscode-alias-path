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
import { getRealPaths, getDepends, hyphenToPascal } from '../util';

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
    if (range) {
      const inputPath = document.getText(range);
      const rootUri = workspace.getWorkspaceFolder(document.uri)?.uri
      const realPaths = getRealPaths(
        inputPath.slice(1, -1),
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

    const findToken = tokens.find(token => {
      return token.keyword === normalized;
    })

    if (findToken) {
      return new Location(
        Uri.file(findToken.filepath),
        findToken.start
      )
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