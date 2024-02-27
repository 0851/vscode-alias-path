'use strict';
import {
  ExtensionContext,
  languages,
  DocumentSelector,
  workspace
} from 'vscode';

import { AliasPathDefinitionProvider } from './provider/definitionProvider';
import { AliasPathConfigProvider } from './provider/configProvider';
import { AliasPathTokensProvider } from './provider/tokenProvider';

let configProvider: ConfigProvider | undefined = undefined;
let tokenProvider: TokenProvider | undefined = undefined;

export function activate(context: ExtensionContext) {
  console.log(context);

  configProvider = new AliasPathConfigProvider(context);

  tokenProvider = new AliasPathTokensProvider(context, {
    configProvider,
  });

  if (!workspace.workspaceFolders?.length) {
    return
  }

  const config = configProvider.getConfig(workspace.workspaceFolders[0].uri);

  const selector: DocumentSelector | undefined = config.activeLanguages;

  if (!selector) {
    return
  }

  const disposableDefinitionProvider = languages.registerDefinitionProvider(
    selector,
    new AliasPathDefinitionProvider(context, {
      configProvider,
      tokenProvider
    })
  )

  context.subscriptions.push(disposableDefinitionProvider);

}

export function deactivate() {
  configProvider?.deactivate()
  configProvider = undefined
  tokenProvider?.deactivate();
  tokenProvider = undefined;
}
