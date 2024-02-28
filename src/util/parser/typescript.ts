import {
  Node,
  createSourceFile,
  ScriptTarget,
  SourceFileLike,
  SyntaxKind,
  ScriptKind,
  FunctionDeclaration,
  ExportDeclaration,
  getLineAndCharacterOfPosition,
  VariableDeclaration,
  NamespaceExport,
  NamedExports
} from 'typescript';
import path from 'path';
import { Position } from 'vscode';

type TraverseOption = {
  source: SourceFileLike,
  needParams: boolean,
  filepath: string,
  defaultName?: string,
}
function traverse(
  node: Node,
  tokenList: TokenItem[],
  depth = 0,
  options: TraverseOption
): void {
  getExportKeyword(
    node,
    tokenList,
    options);
  node.forEachChild((n: Node) => {
    traverse(n,
      tokenList,
      depth + 1,
      options
    );
  });
}

function createToken(
  source: SourceFileLike,
  whereNode: Node,
  keyword: string,
  filepath: string
): TokenItem {
  const start1 = getLineAndCharacterOfPosition(source, whereNode.getStart());
  const end1 = getLineAndCharacterOfPosition(source, whereNode.getEnd());
  const start = new Position(start1.line, start1.character);
  const end = new Position(end1.line, end1.character);
  return {
    filepath,
    keyword,
    start,
    end
  }
}
function getExportKeyword(
  node: Node,
  tokenList: (TokenItem | undefined)[],
  options: TraverseOption,
) {
  try {
    const fnnode = (node as FunctionDeclaration);
    const exnode = (node as ExportDeclaration)
    const exportClause = exnode.exportClause

    const modifiers = fnnode.modifiers;
    const findExpord = modifiers?.find(mod => mod.kind === SyntaxKind.ExportKeyword);
    const findDefault = modifiers?.find(mod => mod.kind === SyntaxKind.DefaultKeyword);

    if (findExpord) {
      if (fnnode.name) {
        tokenList.push(createToken(
          options.source,
          fnnode.name,
          fnnode.name.getText(),
          options.filepath
        ))
      }
      if (findDefault && options.defaultName) {
        tokenList.push(createToken(
          options.source,
          findDefault,
          options.defaultName,
          options.filepath
        ))

      }
      const declarations: VariableDeclaration[] = (fnnode as any).declarationList?.declarations;
      if (declarations?.length) {
        declarations.forEach((declaration: VariableDeclaration) => {
          tokenList.push(createToken(
            options.source,
            declaration.name,
            declaration.name.getText(),
            options.filepath
          ))
        });
      }

    } else if (exportClause) {
      if ((exportClause as NamespaceExport).name) {
        const name = (exportClause as NamespaceExport).name
        tokenList.push(createToken(
          options.source,
          name,
          name.getText(),
          options.filepath
        ))
      }
      if ((exportClause as NamedExports).elements) {
        const elements = (exportClause as NamedExports).elements
        elements.forEach((element) => {
          tokenList.push(createToken(
            options.source,
            element.name,
            element.name.getText(),
            options.filepath
          ))
        });
      }
    }
    if (node.kind === SyntaxKind.Identifier
      && node.getText() === 'module') {
      const name = (node.parent as any).name
      if (name === 'exports') {
        const properties = (node.parent as any).right?.properties
        if (properties?.length) {
          properties.forEach((prop: any) => {
            if (prop.name) {
              tokenList.push(createToken(
                options.source,
                prop.name,
                prop.name.getText(),
                options.filepath
              ))
            }
          })
        }
        tokenList.push(createToken(
          options.source,
          name,
          options.defaultName || '',
          options.filepath
        ))
      }
    }
    if (node.kind === SyntaxKind.Identifier
      && node.getText() === 'exports') {
      const name = (node.parent as any).name
      if (name) {
        tokenList.push(createToken(
          options.source,
          name,
          name.getText(),
          options.filepath
        ))
      }
    }

    return tokenList;
  } catch (error) {
  }
}

/**
 * 
test = `
    export { myFunction as function1, myVariable as variable };
    export default function () {}
    export default class {}
    exports.name = "asdd"
    module.exports = {dd: 'asdd'}
    module.exports.name = {asddd: 'asdd'}
    export const name = "asddd"
    export let test = ()=> {}
    export var sdkj = /sdd/g
    export { default as DefaultExport } from "bar.js";
    export { cube, foo, graph };
    export default function cube(x) {
      return x * x * x;
    }
    `
 * @param filepath 
 * @param content 
 * @param importDefaultName 
 * @returns 
 */
export default function genTokens(
  filepath: string,
  content: string,
  importDefaultName?: string
): TokenItem[] {
  const exportKeywordList: TokenItem[] = [];
  const ext = path.extname(filepath);
  let kind = ScriptKind.TSX;
  if (/tsx?$/.test(ext)) {
    kind = ScriptKind.TSX
  }
  if (/jsx?$/.test(ext)) {
    kind = ScriptKind.JSX
  }
  // content = `
  // export { myFunction as function1, myVariable as variable };
  // export default function () {}
  // export default class {}
  // exports.name = "asdd"
  // module.exports = {dd: 'asdd'}
  // module.exports.name = {asddd: 'asdd'}
  // export const name = "asddd"
  // export let test = ()=> {}
  // export var sdkj = /sdd/g
  // export { default as DefaultExport } from "bar.js";
  // export { cube, foo, graph };
  // export default function cube(x) {
  //   return x * x * x;
  // }
  // `
  const result = createSourceFile(
    filepath,
    content,
    ScriptTarget.ESNext,
    true,
    kind
  );
  traverse(
    result,
    exportKeywordList,
    0,
    {
      needParams: true,
      filepath,
      source: result,
      defaultName: importDefaultName
    }
  );

  return exportKeywordList
}