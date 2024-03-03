

import { parse, CssNode, walk } from 'css-tree';
import { Position } from 'vscode';
import { TokenModel } from '../../provider/tokenProvider';

export default function genTokens(filepath: string, content: string, importDefaultName?: string): TokenItem[] {
  const tokens: TokenItem[] = [];
  try {
    const tokenModel = new TokenModel(
      filepath,
      'css',
      (node: any) => {
        const startOffset = node.loc?.start?.offset;
        const endOffset = node.loc?.end?.offset;
        const startLine = node.loc?.start?.line;
        const startColumn = node.loc?.start?.column;
        const endLine = node.loc?.end?.line;
        const endColumn = node.loc?.end?.column;
        const start = new Position(startLine, startColumn);
        const end = new Position(endLine, endColumn);
        return {
          startOffset,
          endOffset,
          start,
          end
        }
      })
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
        tokenModel.add(node, keyword);
      }
    }
    // traverse AST and modify it
    walk(ast, onWalk);
  } catch (e) {
    // console.log(e);
  }
  return tokens;
}