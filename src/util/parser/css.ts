

import { parse, CssNode, walk } from 'css-tree';
import { Position } from 'vscode';


export default function genTokens(filepath: string, content: string, importDefaultName?: string): TokenItem[] {
  const tokens: TokenItem[] = [];
  try {
    const ast = parse(content, {
      positions: true,
    });
    const onWalk = (node: CssNode) => {
      if ([
        'ClassSelector',
        'IdSelector',
        'TypeSelector',
      ].includes(node.type)) {
        const keyword = (node as any).name;
        const startLine = node.loc?.start?.line;
        const startColumn = node.loc?.start?.column;

        const endLine = node.loc?.end?.line;
        const endColumn = node.loc?.end?.column;
        if (
          keyword === undefined
          || startLine === undefined
          || startColumn === undefined
          || endLine === undefined
          || endColumn === undefined
        ) {
          return
        }
        tokens.push({
          filepath: filepath,
          keyword: keyword,
          start: new Position(startLine, startColumn),
          end: new Position(endLine, endColumn)
        })
      }
    }
    // traverse AST and modify it
    walk(ast, onWalk);
  } catch (e) {
    console.log(e);
  }
  return tokens;
}