import {
  ExtensionContext,
  workspace,
  DocumentSelector,
  Uri,
  Disposable
} from 'vscode';

import path from 'path';

import { debounce, readJsonFile, addGlobalExcludes } from '../util'

type WorkspaceConfig = (Pick<Config, 'allowedIgnoreExt' | 'jsTokenExt' | 'cssTokenExt' | 'alias' | 'maxDependFileSize'> | undefined)

export class AliasPathConfigProvider implements ConfigProvider {
  subscriptions: Disposable[] = []
  workspaceConfigList: WorkspaceConfig[] = [];
  customConfigFile: string | undefined;

  constructor(public context: ExtensionContext) {
    this.context = context;
    this.activate();
  }
  activate() {

    const debounceCreateWorkspaceConfigList = debounce(this.createWorkspaceConfigList.bind(this), 200);

    workspace.onDidChangeWorkspaceFolders(() => {
      debounceCreateWorkspaceConfigList.cancel();
      debounceCreateWorkspaceConfigList();
    })

    const watchConfigFiles = [
      'package.json',
      this.getCustomConfigFile() || '.aliaspath.json',
    ]

    watchConfigFiles.forEach(watch => {
      if (!watch) return
      const watched = workspace.createFileSystemWatcher(watch);
      watched.onDidChange((e: Uri) => { this.updateWorkspaceConfigListWithUri(e) })
      watched.onDidCreate((e: Uri) => { this.updateWorkspaceConfigListWithUri(e) })
      watched.onDidDelete((e: Uri) => { this.updateWorkspaceConfigListWithUri(e) })
      this.subscriptions.push(watched)
    })

    debounceCreateWorkspaceConfigList();
  }
  deactivate() {
    while (this.subscriptions.length) {
      let subscription = this.subscriptions.shift()
      subscription?.dispose?.()
    }
  }
  getCustomConfigFile() {
    const config = workspace.getConfiguration('aliaspath');
    return config.get<string>('configFile')!;
  }
  updateWorkspaceConfigListWithUri(uri: Uri) {
    const workspaceFolder = workspace.getWorkspaceFolder(uri);
    if (!workspaceFolder) {
      return;
    }
    const rootpath = workspaceFolder.uri.fsPath
    const rootindex = workspaceFolder.index

    const workspacePackageJson = readJsonFile<{ aliaspath?: Config }>(path.resolve(rootpath, 'package.json'))
    const workspaceAliasPathJson = readJsonFile<Config>(path.resolve(rootpath, this.getCustomConfigFile() || '.aliaspath.json'))

    const config = workspaceAliasPathJson || workspacePackageJson?.aliaspath
    if (!config) {
      this.workspaceConfigList[rootindex] = undefined
      return
    }
    this.workspaceConfigList[rootindex] = {
      alias: config.alias,
      allowedIgnoreExt: config.allowedIgnoreExt,
      maxDependFileSize: config.maxDependFileSize,
    }
  }
  createWorkspaceConfigList() {
    const workspaceFolders = workspace.workspaceFolders || []
    workspaceFolders.forEach(folder => {
      this.updateWorkspaceConfigListWithUri(folder.uri)
    })
  }
  getConfig(uri: Uri): Config {
    const config = workspace.getConfiguration('aliaspath');
    const workspaceFolder = workspace.getWorkspaceFolder(uri);

    let workspaceConfig: WorkspaceConfig = undefined;

    if (workspaceFolder?.index !== undefined) {
      workspaceConfig = this.workspaceConfigList[workspaceFolder.index]
    }

    // console.log(config, this.context, '====config===');

    let activeLanguages = config.get<DocumentSelector>('activeLanguages')!;
    let autoSuggestion = config.get<boolean>('autoSuggestion')!;
    let excludeGlobs = config.get<string[]>('excludeGlobs')! || [];
    let allowedIgnoreExt = workspaceConfig?.allowedIgnoreExt || config.get<string[]>('allowedIgnoreExt')!;
    let cssTokenExt = workspaceConfig?.cssTokenExt || config.get<string[]>('cssTokenExt')!;
    let jsTokenExt = workspaceConfig?.jsTokenExt || config.get<string[]>('jsTokenExt')!;
    let maxDependFileSize = workspaceConfig?.maxDependFileSize || config.get<number>('maxDependFileSize')!;
    let alias = workspaceConfig?.alias || config.get<Record<string, string>>('alias')!;

    excludeGlobs.push(...addGlobalExcludes(workspace.getConfiguration('search').get<Record<string, boolean>>('exclude')))
    excludeGlobs.push(...addGlobalExcludes(workspace.getConfiguration('files').get<Record<string, boolean>>('exclude')))

    return {
      activeLanguages: activeLanguages,
      autoSuggestion: autoSuggestion,
      allowedIgnoreExt: allowedIgnoreExt,
      excludeGlobs: excludeGlobs,
      maxDependFileSize: maxDependFileSize,
      cssTokenExt: cssTokenExt,
      jsTokenExt: jsTokenExt,
      alias: alias,
    }
  }
}