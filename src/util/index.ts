import fs from 'fs';
import path from 'path'
import { Uri } from 'vscode'
export function readJsonFile<T extends Object = Record<string, any>>(jsonPath: string): undefined | T {
  if (!fs.existsSync(jsonPath)) {
    return undefined
  }
  try {
    const fileContent = fs.readFileSync(jsonPath).toString();
    const fileJson = JSON.parse(fileContent);
    return fileJson;
  } catch (e) {
    return undefined;
  }
}
export function getFileMBSize(fp: string) {
  try {
    const BYTES_PER_MB = 1024 ** 2;
    const fileStats = fs.statSync(fp)
    const fileSizeInMb = fileStats.size / BYTES_PER_MB;
    return fileSizeInMb
  } catch (e) {
    return 0;
  }
}

export function debounce<T extends Function>(fn: T, timeout: number, ctx?: any): T & { cancel: () => void } {
  let timer: NodeJS.Timer | undefined;
  let cancel = () => {
    timer && clearTimeout(timer);
  }
  const ret = function (...args: any[]) {
    cancel();
    timer = setTimeout(() => {
      fn.call(ctx, ...args);
      timer = undefined;
    }, timeout);
  }
  Object.assign(ret, {
    cancel: cancel
  })
  return ret as any;
}

function fsPathAddExt(option: {
  fsPath: string,
  aliasKey: string,
  aliasValue: string,
  exts: string[],
  rootPath: string,
  relativePath: string
}): string[] {
  let aliasValue = option.aliasValue;
  let fsPath = option.fsPath;
  const { aliasKey, relativePath, exts, rootPath } = option;

  aliasValue = aliasValue.replace('${cwd}', rootPath);

  fsPath = path.normalize(fsPath.replace(aliasKey, aliasValue));

  if (!path.isAbsolute(fsPath)) {
    fsPath = path.resolve(path.dirname(relativePath), fsPath);
  }

  const extname = path.extname(fsPath);

  let paths = [];

  if (!extname) {
    exts.forEach(ext => {
      paths.push(path.resolve(fsPath, `index.${ext}`))
      paths.push(`${fsPath}.${ext}`)
    })
  } else {
    paths.push(fsPath);
  }

  paths = paths.filter(fp => {
    if (fs.existsSync(fp) && fs.statSync(fp).isFile()) {
      return true
    }
    return false
  })
  return paths;
}

export function getRealPaths(
  filePath: string,
  config: Config & {
    rootUri?: Uri,
    importDefaultName?: string
    relativeUri: Uri
  }): DependPathItem[] {
  let filepaths: string[] = [];
  const alias = config.alias || {};
  const allowedExt = config.allowedExt || [];

  Object.keys(alias)
    .map(aliasKey => {
      filepaths.push(...fsPathAddExt({
        fsPath: filePath,
        aliasKey,
        aliasValue: alias[aliasKey],
        exts: allowedExt,
        rootPath: config.rootUri?.fsPath || '',
        relativePath: config.relativeUri.fsPath,
      }));
    })
    filepaths = [...new Set(filepaths)]
  return filepaths.map(fp=> {
    return {
      filepath: fp,
      importDefaultName: config.importDefaultName,
    }
  });
}

export function getDepends(text: string): DependItem[] {
  let items: DependItem[] = [];

  let regs = [
    /import[\s]+(?<dname>[a-zA-Z_$]+)?[\s\S]+?from\s+?(['"])(?<filepath>[^\1]+?)\2/g,
    /(?:var|const|let)[\s]+(?<dname>[a-zA-Z_$]+)?[\s\S]+?\=\s*?require\([\s]*?(['"])(?<filepath>[^\1]+?)\2[\s]*?\)/g
  ]
  let m;

  regs.forEach((reg) => {
    while ((m = reg.exec(text)) !== null) {
      if (m.index === reg.lastIndex) {
        reg.lastIndex++;
      }
      const groups = ((m as any).groups || {} ) as Record<string, string>;
      items.push({
        filepath: groups.filepath,
        importDefaultName: groups.dname,
        matchString: m[0],
        matchStart: m.index,
        matchEnd: reg.lastIndex,
      })
    }
  })
  return items;
}

/**
 * key-Key-Key-> KeyKeyKey
 *
 * @export
 * @param {string} str
 * @returns {string}
 */
export function hyphenToPascal(str: string): string {
  return str.replace(/(?:^|-)(.)/g, (all, match1) => {
    return (match1 || '').toUpperCase()
  })
}
