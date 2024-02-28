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
  filepath: string,
  defaultName?: string,
  getPosition: (offset: number) => Position
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
  whereNode: Node,
  keyword: string,
  options: TraverseOption
): TokenItem {
  const start = options.getPosition(whereNode.getStart());
  const end = options.getPosition(whereNode.getEnd());
  return {
    filepath: options.filepath,
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
          fnnode.name,
          fnnode.name.getText(),
          options,
        ))
      }
      if (findDefault && options.defaultName) {
        tokenList.push(createToken(
          findDefault,
          options.defaultName,
          options
        ))

      }
      const declarations: VariableDeclaration[] = (fnnode as any).declarationList?.declarations;
      if (declarations?.length) {
        declarations.forEach((declaration: VariableDeclaration) => {
          tokenList.push(createToken(
            declaration.name,
            declaration.name.getText(),
            options
          ))
        });
      }

    } else if (exportClause) {
      if ((exportClause as NamespaceExport).name) {
        const name = (exportClause as NamespaceExport).name
        tokenList.push(createToken(
          name,
          name.getText(),
          options
        ))
      }
      if ((exportClause as NamedExports).elements) {
        const elements = (exportClause as NamedExports).elements
        elements.forEach((element) => {
          tokenList.push(createToken(
            element.name,
            element.name.getText(),
            options
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
                prop.name,
                prop.name.getText(),
                options
              ))
            }
          })
        }
        tokenList.push(createToken(
          name,
          options.defaultName || '',
          options
        ))
      }
    }
    if (node.kind === SyntaxKind.Identifier
      && node.getText() === 'exports') {
      const name = (node.parent as any).name
      if (name) {
        tokenList.push(createToken(
          name,
          name.getText(),
          options
        ))
      }
    }
    if(node.kind === SyntaxKind.ExportAssignment){
      tokenList.push(createToken(
        node,
        options.defaultName || '',
        options
      ))
    }
    return tokenList;
  } catch (error) {
  }
}


function vue(
  filepath: string,
  source: SourceFileLike,
  content: string,
  importDefaultName: string,
  exportKeywordList: TokenItem[]
) {
  let reg = /(?<=\<script[\s\S]*?\>)([\s\S]*?)(?=<\/script\>)/g
  let m;
  while ((m = reg.exec(content)) !== null) {
    const start = m.index
    if (start === reg.lastIndex) {
      reg.lastIndex++;
    }
    const scriptcontent = m[1]
    if (!scriptcontent) {
      return;
    }
    const innersource = createSourceFile(
      filepath,
      scriptcontent,
      ScriptTarget.ESNext,
      true,
      ScriptKind.TSX
    );

    traverse(
      innersource,
      exportKeywordList,
      0,
      {
        filepath,
        defaultName: importDefaultName,
        getPosition: (offset: number) => {
          const pos = getLineAndCharacterOfPosition(source, start + offset)
          return new Position(pos.line, pos.character);
        }
      }
    );
    console.log(m, '===m==');
  }
}

/**
 * 
test = `
    export { myFunction as function1, myVariable as variable };
    export default function () {}
    export default class {}
    export default {
      asdd: 'asdd'
    }
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
  // export default {
  //   asdd: 'asdd'
  // }
  // `

  const source = createSourceFile(
    filepath,
    content,
    ScriptTarget.ESNext,
    true,
    kind
  );

  traverse(
    source,
    exportKeywordList,
    0,
    {
      filepath,
      defaultName: importDefaultName,
      getPosition: (offset: number) => {
        const pos = getLineAndCharacterOfPosition(source, offset)
        return new Position(pos.line, pos.character);
      }
    }
  );

  vue(filepath, source, content, importDefaultName || '', exportKeywordList)

  return exportKeywordList
}