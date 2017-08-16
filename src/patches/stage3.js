import {
  uBranchHash
} from "../utils";

import {
  cloneNode,
  processLabels,
  parseExpression,
  parseExpressionStatement,
  isTryStatement,
  isSwitchStatement,
  isLabeledStatement
} from "../helpers";

import STAGE1 from "./stage1";

let STAGE3 = {};

STAGE3.BlockStatement = function(node, patcher) {
  let body = node.body;
  // transform try, switch and labels here
  for (let ii = 0; ii < body.length; ++ii) {
    let child = body[ii];
    //if (child.magic) continue;
    // labeled statement
    let isLabeledStmt = isLabeledStatement(child.type);
    if (isLabeledStmt) {
      child = processLabels(child);
    }
    let isTryStmt = isTryStatement(child.type);
    let isSwitchStmt = isSwitchStatement(child.type);
    let hash = -1;
    let isHashBranch = (
      isTryStmt ||
      isSwitchStmt
    );
    // only generate hash if necessary
    if (isHashBranch) hash = uBranchHash();
    // #ENTER
    if (isHashBranch) {
      let link = patcher.instance.getLinkCall(
        isTryStmt ? "DEBUG_TRY_ENTER" :
        isSwitchStmt ? "DEBUG_SWITCH_ENTER" :
        "" // throws error
      );
      let start = parseExpressionStatement(link);
      patcher.nodes[hash] = {
        hash: hash,
        node: cloneNode(child)
      };
      start.expression.arguments.push(
        parseExpression(hash)
      );
      body.splice(ii, 0, start);
      ii++;
    }
    // switch test
    if (isSwitchStmt) {
      let test = {
        magic: true,
        type: "CallExpression",
        callee: {
          magic: true,
          type: "Identifier",
          name: patcher.instance.getLink("DEBUG_SWITCH_TEST")
        },
        arguments: [
          parseExpression(hash),
          child.discriminant
        ]
      };
      child.discriminant = test;
    }
    patcher.walk(child, patcher, patcher.stage);
    // #LEAVE
    if (isHashBranch) {
      let link = patcher.instance.getLinkCall(
        isTryStmt ? "DEBUG_TRY_LEAVE" :
        isSwitchStmt ? "DEBUG_SWITCH_LEAVE" :
        "" // throws error
      );
      let end = parseExpressionStatement(link);
      end.expression.arguments.push(
        parseExpression(hash)
      );
      body.splice(ii + 1, 0, end);
      ii++;
    }
  };
};

STAGE3.Program = STAGE1.Program;
STAGE3.MethodDefinition = STAGE1.MethodDefinition;
STAGE3.FunctionDeclaration = STAGE1.FunctionDeclaration;
STAGE3.FunctionExpression = STAGE1.FunctionExpression;
STAGE3.ArrowFunctionExpression = STAGE1.ArrowFunctionExpression;

export default STAGE3;
