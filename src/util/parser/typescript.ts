import {
  Node,
  createSourceFile,
  ScriptTarget,
  SourceFileLike,
  SyntaxKind,
  ScriptKind,
  FunctionDeclaration,
  ExportDeclaration,
  VariableDeclaration,
  getLineAndCharacterOfPosition,
  NamedExports,
  NamespaceExport,
} from 'typescript';
import path from 'path';
import { Position } from 'vscode';
import { TokenModel } from '../../provider/tokenProvider';

type TraverseOption = {
  filepath: string,
  defaultName?: string,
}

function getPosition(source: any, node: any, ofs: number) {
  const startOffset = node.getStart();
  const endOffset = node.getEnd();
  const startPos = getLineAndCharacterOfPosition(source, ofs + startOffset)
  const endPos = getLineAndCharacterOfPosition(source, ofs + endOffset)
  const start = new Position(startPos.line, startPos.character);
  const end = new Position(endPos.line, endPos.character);
  return {
    startOffset,
    endOffset,
    start,
    end,
  };
}

function traverse(
  node: Node,
  tokenModel: TokenModel,
  depth = 0,
  options: TraverseOption
): void {
  getExportKeyword(
    node,
    tokenModel,
    options);
  node.forEachChild((n: Node) => {
    traverse(n,
      tokenModel,
      depth + 1,
      options
    );
  });
}

function getExportKeyword(
  node: Node,
  tokenModel: TokenModel,
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
        tokenModel.add(
          fnnode.name,
          fnnode.name.getText()
        )
      }
      if (findDefault && options.defaultName) {
        tokenModel.add(
          findDefault,
          options.defaultName
        )
      }
      const declarations: VariableDeclaration[] = (fnnode as any).declarationList?.declarations;
      if (declarations?.length) {
        declarations.forEach((declaration: VariableDeclaration) => {
          tokenModel.add(
            declaration.name,
            declaration.name.getText()
          )
        });
      }

    } else if (exportClause) {
      if ((exportClause as NamespaceExport).name) {
        const name = (exportClause as NamespaceExport).name
        tokenModel.add(
          name,
          name.getText()
        )
      }
      if ((exportClause as NamedExports).elements) {
        const elements = (exportClause as NamedExports).elements
        elements.forEach((element) => {
          tokenModel.add(
            element.name,
            element.name.getText()
          )
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
              tokenModel.add(
                prop.name,
                prop.name.getText()
              )
            }
          })
        }
        tokenModel.add(
          name,
          options.defaultName || ''
        )
      }
    }
    if (node.kind === SyntaxKind.Identifier
      && node.getText() === 'exports') {
      const name = (node.parent as any).name
      if (name) {
        tokenModel.add(
          name,
          name.getText()
        )
      }
    }
    if (node.kind === SyntaxKind.ExportAssignment) {
      tokenModel.add(
        node,
        options.defaultName || ''
      )
    }
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

    const tokenModel = new TokenModel(
      filepath,
      'typescript',
      (node: any) => {
        return getPosition(source, node, start)
      }
    )

    traverse(
      innersource,
      tokenModel,
      0,
      {
        filepath,
        defaultName: importDefaultName
      }
    );

    exportKeywordList.push(...tokenModel.tokens);

    // console.log(m, '===m==');
  }
}

/**
 *
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
  // export const name = "asddd"
  // export { myFunction as function1, myVariable as variable };
  // export default function () {}
  // export { A } from "./a";
  // export default class {}
  // exports.name = "asdd"
  // module.exports = {dd: 'asdd'}
  // module.exports.name = {asddd: 'asdd'}
  // export type A = string;
  // export let test = ()=> {}
  // export var sdkj = /sdd/g
  // export { default as DefaultExport } from "bar.js";
  // export { cube, foo, graph };
  // export default function cube(x) {
  //   return x * x * x;
  // }
  // `

  const source = createSourceFile(
    filepath,
    content,
    ScriptTarget.ESNext,
    true,
    kind
  );

  const tokenModel = new TokenModel(
    filepath,
    'typescript',
    (node: any) => {
      return getPosition(source, node, 0)
    })

  traverse(
    source,
    tokenModel,
    0,
    {
      filepath,
      defaultName: importDefaultName,
    }
  );

  exportKeywordList.push(...tokenModel.tokens);

  vue(filepath, source, content, importDefaultName || '', exportKeywordList)

  return exportKeywordList
}