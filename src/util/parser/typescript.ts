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

function getExportKeyword(
  node: Node,
  tokenList: TokenItem[],
  options: TraverseOption,
) {
  try {
    let keyword: string | undefined = ''
    let start: Position | undefined = undefined;
    let end: Position | undefined = undefined;
    const fnnode = (node as FunctionDeclaration);
    const exnode = (node as ExportDeclaration)
    const exportClause = exnode.exportClause

    const modifiers = fnnode.modifiers;
    const findExpord = modifiers?.find(mod => mod.kind === SyntaxKind.ExportKeyword);
    const findDefault = modifiers?.find(mod => mod.kind === SyntaxKind.DefaultKeyword);

    if (findExpord) {
      if (fnnode.name) {
        keyword = fnnode.name.getText();
        const start1 = getLineAndCharacterOfPosition(options.source, fnnode.name.getStart());
        const end1 = getLineAndCharacterOfPosition(options.source, fnnode.name.getEnd());
        start = new Position(start1.line, start1.character);
        end = new Position(end1.line, end1.character);
      }
      if (findDefault && options.defaultName) {
        keyword = options.defaultName;
        const start1 = getLineAndCharacterOfPosition(options.source, findDefault.getStart());
        const end1 = getLineAndCharacterOfPosition(options.source, findDefault.getEnd());
        start = new Position(start1.line, start1.character);
        end = new Position(end1.line, end1.character);
      }
      const declarations: VariableDeclaration[] = (fnnode as any).declarationList?.declarations;
      if (declarations?.length) {
        declarations.forEach((declaration: VariableDeclaration) => {
          keyword = declaration.name.getText();
          const start1 = getLineAndCharacterOfPosition(options.source, declaration.getStart());
          const end1 = getLineAndCharacterOfPosition(options.source, declaration.getEnd());
          start = new Position(start1.line, start1.character);
          end = new Position(end1.line, end1.character);
        });
      }

    } else if (exportClause) {
      if ((exportClause as NamespaceExport).name) {
        const name = (exportClause as NamespaceExport).name
        keyword = name.getText();
        const start1 = getLineAndCharacterOfPosition(options.source, name.getStart());
        const end1 = getLineAndCharacterOfPosition(options.source, name.getEnd());
        start = new Position(start1.line, start1.character);
        end = new Position(end1.line, end1.character);
      }
      if ((exportClause as NamedExports).elements) {
        const elements = (exportClause as NamedExports).elements
        elements.forEach((element) => {
          keyword = element.name.getText();
          const start1 = getLineAndCharacterOfPosition(options.source, element.name.getStart());
          const end1 = getLineAndCharacterOfPosition(options.source, element.name.getEnd());
          start = new Position(start1.line, start1.character);
          end = new Position(end1.line, end1.character);
        });
      }
    }

    if (keyword !== undefined
      && start !== undefined
      && end !== undefined) {
      tokenList.push({
        filepath: options.filepath,
        keyword,
        start,
        end
      })
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
  return exportKeywordList;
}