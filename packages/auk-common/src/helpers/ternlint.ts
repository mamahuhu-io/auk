/* eslint-disable @typescript-eslint/no-explicit-any, eqeqeq */

import infer from "tern/lib/infer"
import tern from "tern/lib/tern"
import * as walk from "acorn-walk"

interface Rule {
  severity: string
}

interface Rules {
  [key: string]: Rule
}

interface LintMessage {
  message: string
  from: any
  to: any
  severity: string
  lineNumber?: number
  file?: string
}

interface LintResult {
  messages: LintMessage[]
}

interface TernServer {
  files: any[]
  _lint?: {
    rules: Rules
  }
}

interface TernQuery {
  lineNumber?: boolean
  lineCharPositions?: boolean
  groupByFiles?: boolean
}

interface TernFile {
  name: string
  ast: any
  scope: any
}

const defaultRules: Rules = {
  UnknownProperty: { severity: "warning" },
  UnknownIdentifier: { severity: "warning" },
  NotAFunction: { severity: "error" },
  InvalidArgument: { severity: "error" },
  UnusedVariable: { severity: "warning" },
  UnknownModule: { severity: "error" },
  MixedReturnTypes: { severity: "warning" },
  ObjectLiteral: { severity: "error" },
  TypeMismatch: { severity: "warning" },
  Array: { severity: "error" },
  ES6Modules: { severity: "error" },
}

function makeVisitors(
  server: TernServer,
  query: TernQuery,
  file: TernFile,
  messages: LintMessage[]
) {
  function addMessage(node: any, msg: string, severity: string): void {
    const error = makeError(node, msg, severity)
    messages.push(error)
  }

  function makeError(node: any, msg: string, severity: string): LintMessage {
    const pos = getPosition(node)
    const error: LintMessage = {
      message: msg,
      from: tern.outputPos(query, file, pos.start),
      to: tern.outputPos(query, file, pos.end),
      severity: severity,
    }
    if (query.lineNumber) {
      error.lineNumber = query.lineCharPositions
        ? error.from.line
        : tern.outputPos({ lineCharPositions: true }, file, pos.start).line
    }
    if (!query.groupByFiles) error.file = file.name
    return error
  }

  function getNodeName(node: any): string {
    if (node.callee) {
      return getNodeName(node.callee)
    } else if (node.property) {
      return node.property.name
    }
    return node.name
  }

  function getNodeValue(node: any): any {
    if (node.callee) {
      return getNodeValue(node.callee)
    } else if (node.property) {
      return node.property.value
    }
    if (node.type === "Identifier") {
      const q = { type: "definition", start: node.start, end: node.end }
      const expr = tern.findQueryExpr(file, q)
      const type = infer.expressionType(expr)
      const objExpr = type.getType()
      if (objExpr && objExpr.originNode) return getNodeValue(objExpr.originNode)
      return null
    }
    return node.value
  }

  function getPosition(node: any): any {
    if (node.callee) {
      return getPosition(node.callee)
    }
    if (node.property) {
      return node.property
    }
    return node
  }

  function getTypeName(type: any): string {
    if (!type) return "Unknown type"
    if (type.types) {
      const types = type.types
      let s = ""
      for (let i = 0; i < types.length; i++) {
        if (i > 0) s += "|"
        const t = getTypeName(types[i])
        if (t != "Unknown type") s += t
      }
      return s == "" ? "Unknown type" : s
    }
    if (type.name) {
      return type.name
    }
    return type.proto ? type.proto.name : "Unknown type"
  }

  function hasProto(expectedType: any, name: string): boolean {
    if (!expectedType) return false
    if (!expectedType.proto) return false
    return expectedType.proto.name === name
  }

  function isRegexExpected(expectedType: any): boolean {
    return hasProto(expectedType, "RegExp.prototype")
  }

  function isEmptyType(val: any): boolean {
    return !val || (val.types && val.types.length == 0)
  }

  function compareType(expected: any, actual: any): boolean {
    if (isEmptyType(expected) || isEmptyType(actual)) return true
    if (expected.types) {
      for (let i = 0; i < expected.types.length; i++) {
        if (actual.types) {
          for (let j = 0; j < actual.types.length; j++) {
            if (compareType(expected.types[i], actual.types[j])) return true
          }
        } else {
          if (compareType(expected.types[i], actual.getType())) return true
        }
      }
      return false
    } else if (actual.types) {
      for (let i = 0; i < actual.types.length; i++) {
        if (compareType(expected.getType(), actual.types[i])) return true
      }
    }
    const expectedType = expected.getType()
    const actualType = actual.getType()
    if (!expectedType || !actualType) return true
    let currentProto = actualType.proto
    while (currentProto) {
      if (expectedType.proto && expectedType.proto.name === currentProto.name)
        return true
      currentProto = currentProto.proto
    }
    return false
  }

  function checkPropsInObject(
    node: any,
    expectedArg: any,
    actualObj: any,
    invalidArgument: Rule
  ): void {
    const properties = node.properties
    const expectedObj = expectedArg.getType()
    for (let i = 0; i < properties.length; i++) {
      const property = properties[i]
      const key = property.key
      const prop = key && key.name
      const value = property.value
      if (prop) {
        const expectedType = expectedObj.hasProp(prop)
        if (!expectedType) {
          addMessage(
            key,
            "Invalid property at " +
              (i + 1) +
              ": " +
              prop +
              " is not a property in " +
              getTypeName(expectedArg),
            invalidArgument.severity
          )
        } else {
          const actualType = actualObj.props[prop]
          if (!compareType(expectedType, actualType)) {
            addMessage(
              value,
              "Invalid property at " +
                (i + 1) +
                ": cannot convert from " +
                getTypeName(actualType) +
                " to " +
                getTypeName(expectedType),
              invalidArgument.severity
            )
          }
        }
      }
    }
  }

  function checkItemInArray(
    node: any,
    expectedArg: any,
    state: any,
    invalidArgument: Rule
  ): void {
    const elements = node.elements
    const expectedType = expectedArg.hasProp("<i>")
    for (let i = 0; i < elements.length; i++) {
      const elt = elements[i]
      const actualType = infer.expressionType({ node: elt, state: state })
      if (!compareType(expectedType, actualType)) {
        addMessage(
          elt,
          "Invalid item at " +
            (i + 1) +
            ": cannot convert from " +
            getTypeName(actualType) +
            " to " +
            getTypeName(expectedType),
          invalidArgument.severity
        )
      }
    }
  }

  function isObjectLiteral(type: any): boolean {
    const objType = type.getObjType()
    return objType && objType.proto && objType.proto.name == "Object.prototype"
  }

  function getFunctionLint(fnType: any): any {
    if (fnType.lint) return fnType.lint
    if (fnType.metaData) {
      fnType.lint = getLint(fnType.metaData["!lint"])
      return fnType.lint
    }
  }

  function isFunctionType(type: any): boolean {
    if (type.types) {
      for (let i = 0; i < type.types.length; i++) {
        if (isFunctionType(type.types[i])) return true
      }
    }
    return type.proto && type.proto.name == "Function.prototype"
  }

  function validateCallExpression(node: any, state: any, _c: any): void {
    const notAFunctionRule = getRule("NotAFunction")
    const invalidArgument = getRule("InvalidArgument")
    if (!notAFunctionRule && !invalidArgument) return
    const type = infer.expressionType({ node: node.callee, state: state })
    if (!type.isEmpty()) {
      const fnType = type.getFunctionType()
      if (fnType == null) {
        if (notAFunctionRule && !isFunctionType(type))
          addMessage(
            node,
            "'" + getNodeName(node) + "' is not a function",
            notAFunctionRule.severity
          )
        return
      }
      const fnLint = getFunctionLint(fnType)
      const continueLint = fnLint ? fnLint(node, addMessage, getRule) : true
      if (continueLint && fnType.args) {
        if (!invalidArgument) return
        const actualArgs = node.arguments
        if (!actualArgs) return
        const expectedArgs = fnType.args
        for (let i = 0; i < expectedArgs.length; i++) {
          const expectedArg = expectedArgs[i]
          if (actualArgs.length > i) {
            const actualNode = actualArgs[i]
            if (isRegexExpected(expectedArg.getType())) {
              const value = getNodeValue(actualNode)
              if (value) {
                try {
                  new RegExp(value)
                } catch (e) {
                  addMessage(
                    actualNode,
                    "Invalid argument at " + (i + 1) + ": " + e,
                    invalidArgument.severity
                  )
                }
              }
            } else {
              const actualArg = infer.expressionType({
                node: actualNode,
                state: state,
              })
              if (!(expectedArg.getObjType() && isObjectLiteral(actualArg))) {
                if (!compareType(expectedArg, actualArg)) {
                  addMessage(
                    actualNode,
                    "Invalid argument at " +
                      (i + 1) +
                      ": cannot convert from " +
                      getTypeName(actualArg) +
                      " to " +
                      getTypeName(expectedArg),
                    invalidArgument.severity
                  )
                }
              }
            }
          }
        }
      }
    }
  }

  function validateAssignment(
    nodeLeft: any,
    nodeRight: any,
    rule: Rule | undefined,
    state: any
  ): void {
    if (!nodeLeft || !nodeRight) return
    if (!rule) return
    const leftType = infer.expressionType({ node: nodeLeft, state: state })
    const rightType = infer.expressionType({ node: nodeRight, state: state })
    if (!compareType(leftType, rightType)) {
      addMessage(
        nodeRight,
        "Type mismatch: cannot convert from " +
          getTypeName(leftType) +
          " to " +
          getTypeName(rightType),
        rule.severity
      )
    }
  }

  function validateDeclaration(node: any, state: any, _c: any): void {
    function isUsedVariable(
      varNode: any,
      varState: any,
      f: TernFile,
      srv: TernServer
    ): boolean {
      const name = varNode.name

      let scope: any
      for (
        scope = varState;
        scope && !(name in scope.props);
        scope = scope.prev
      ) {}
      if (!scope) return false

      let hasRef = false
      function searchRef(_f: TernFile) {
        return function (n: any, _scopeHere: any) {
          if (n != varNode) {
            hasRef = true
            throw new Error()
          }
        }
      }

      try {
        if (scope.node) {
          infer.findRefs(scope.node, scope, name, scope, searchRef(f))
        } else {
          infer.findRefs(f.ast, f.scope, name, scope, searchRef(f))
          for (let i = 0; i < srv.files.length && !hasRef; ++i) {
            const cur = srv.files[i]
            if (cur != f)
              infer.findRefs(cur.ast, cur.scope, name, scope, searchRef(cur))
          }
        }
      } catch (_e) {}
      return hasRef
    }

    const unusedRule = getRule("UnusedVariable")
    const mismatchRule = getRule("TypeMismatch")
    if (!unusedRule && !mismatchRule) return
    switch (node.type) {
      case "VariableDeclaration":
        for (let i = 0; i < node.declarations.length; ++i) {
          const decl = node.declarations[i]
          const varNode = decl.id
          if (varNode.name != "✖") {
            if (unusedRule && !isUsedVariable(varNode, state, file, server))
              addMessage(
                varNode,
                "Unused variable '" + getNodeName(varNode) + "'",
                unusedRule.severity
              )
            if (mismatchRule)
              validateAssignment(varNode, decl.init, mismatchRule, state)
          }
        }
        break
      case "FunctionDeclaration":
        if (unusedRule) {
          const varNode = node.id
          if (
            varNode.name != "✖" &&
            !isUsedVariable(varNode, state, file, server)
          )
            addMessage(
              varNode,
              "Unused function '" + getNodeName(varNode) + "'",
              unusedRule.severity
            )
        }
        break
    }
  }

  function getArrType(type: any): any {
    if (type instanceof infer.Arr) {
      return type.getObjType()
    } else if (type.types) {
      for (let i = 0; i < type.types.length; i++) {
        if (getArrType(type.types[i])) return type.types[i]
      }
    }
  }

  const visitors = {
    VariableDeclaration: validateDeclaration,
    FunctionDeclaration: validateDeclaration,
    ReturnStatement: function (node: any, state: any, _c: any) {
      if (!node.argument) return
      const rule = getRule("MixedReturnTypes")
      if (!rule) return
      if (state.fnType && state.fnType.retval) {
        const actualType = infer.expressionType({
          node: node.argument,
          state: state,
        })
        const expectedType = state.fnType.retval
        if (!compareType(expectedType, actualType)) {
          addMessage(
            node,
            "Invalid return type : cannot convert from " +
              getTypeName(actualType) +
              " to " +
              getTypeName(expectedType),
            rule.severity
          )
        }
      }
    },
    MemberExpression: function (node: any, state: any, _c: any) {
      const rule = getRule("UnknownProperty")
      if (!rule) return
      const prop = node.property && node.property.name
      if (!prop || prop == "✖") return
      const type = infer.expressionType({ node: node, state: state })
      const parentType = infer.expressionType({
        node: node.object,
        state: state,
      })

      if (node.computed) {
        return
      }

      if (!parentType.isEmpty() && type.isEmpty()) {
        let propertyDefined = false

        if (parentType.types) {
          parentType.types.forEach(function (potentialType: any) {
            if (
              typeof potentialType.hasProp === "function" &&
              potentialType.hasProp(prop, true)
            ) {
              propertyDefined = true
            }
          })
        }

        if (!propertyDefined) {
          addMessage(
            node,
            "Unknown property '" + getNodeName(node) + "'",
            rule.severity
          )
        }
      }
    },
    Identifier: function (node: any, state: any, _c: any) {
      const rule = getRule("UnknownIdentifier")
      if (!rule) return
      const type = infer.expressionType({ node: node, state: state })

      if (type.originNode != null || type.origin != null) {
        // The node is defined somewhere
      } else if (type.isEmpty()) {
        addMessage(
          node,
          "Unknown identifier '" + getNodeName(node) + "'",
          rule.severity
        )
      }
    },
    NewExpression: validateCallExpression,
    CallExpression: validateCallExpression,
    AssignmentExpression: function (node: any, state: any, _c: any) {
      const rule = getRule("TypeMismatch")
      validateAssignment(node.left, node.right, rule, state)
    },
    ObjectExpression: function (node: any, state: any, _c: any) {
      const rule = getRule("ObjectLiteral")
      if (!rule) return
      const actualType = node.objType
      const ctxType = infer.typeFromContext(file.ast, {
        node: node,
        state: state,
      })
      let expectedType = null
      if (ctxType instanceof infer.Obj) {
        expectedType = ctxType.getObjType()
      } else if (ctxType && ctxType.makeupType) {
        const objType = ctxType.makeupType()
        if (objType && objType.getObjType()) {
          expectedType = objType.getObjType()
        }
      }
      if (expectedType && expectedType != actualType) {
        checkPropsInObject(node, expectedType, actualType, rule)
      }
    },
    ArrayExpression: function (node: any, state: any, _c: any) {
      const rule = getRule("Array")
      if (!rule) return
      const ctxType = infer.typeFromContext(file.ast, {
        node: node,
        state: state,
      })
      const expectedType = getArrType(ctxType)
      if (expectedType) {
        checkItemInArray(node, expectedType, state, rule)
      }
    },
    ImportDeclaration: function (node: any, _state: any, _c: any) {
      const rule = getRule("ES6Modules")
      if (!rule) return
      const me = infer.cx().parent.mod.modules
      if (!me) return
      const source = node.source
      if (!source) return
      const modType = me.getModType(source)
      if (!modType) {
        addMessage(
          source,
          "Invalid modules from '" + source.value + "'",
          rule.severity
        )
        return
      }
      const specifiers = node.specifiers
      if (!specifiers) return
      for (let i = 0; i < specifiers.length; i++) {
        const specifier = specifiers[i]
        const imported = specifier.imported
        if (imported) {
          const name = imported.name
          if (!modType.hasProp(name))
            addMessage(
              imported,
              "Invalid modules specifier '" + getNodeName(imported) + "'",
              rule.severity
            )
        }
      }
    },
  }

  return visitors
}

export function validateFile(
  server: TernServer,
  query: TernQuery,
  file: TernFile
): LintResult {
  try {
    const messages: LintMessage[] = []
    const ast = file.ast
    const state = file.scope
    const visitors = makeVisitors(server, query, file, messages)
    walk.simple(ast, visitors, infer.searchVisitor, state)
    return { messages: messages }
  } catch (e) {
    console.error((e as Error).stack)
    return { messages: [] }
  }
}

export function registerTernLinter(): void {
  tern.defineQueryType("lint", {
    takesFile: true,
    run: function (server: TernServer, query: TernQuery, file: TernFile) {
      return validateFile(server, query, file)
    },
  })

  tern.defineQueryType("lint-full", {
    run: function (server: TernServer, query: TernQuery) {
      return validateFiles(server, query)
    },
  })

  tern.registerPlugin("lint", function (server: TernServer, options: any) {
    server._lint = {
      rules: getRules(options),
    }
    return {
      passes: {},
      loadFirst: true,
    }
  })
}

export function validateFiles(
  server: TernServer,
  query: TernQuery
): LintResult | { messages: Array<{ file: string; messages: LintMessage[] }> } {
  try {
    const messages: LintMessage[] = []
    const files = server.files
    const groupByFiles = query.groupByFiles == true
    const groupedMessages: Array<{ file: string; messages: LintMessage[] }> = []

    for (let i = 0; i < files.length; ++i) {
      const messagesFile: LintMessage[] = groupByFiles ? [] : messages
      const file = files[i]
      const ast = file.ast
      const state = file.scope
      const visitors = makeVisitors(server, query, file, messagesFile)
      walk.simple(ast, visitors, infer.searchVisitor, state)
      if (groupByFiles)
        groupedMessages.push({ file: file.name, messages: messagesFile })
    }
    return groupByFiles ? { messages: groupedMessages } : { messages: messages }
  } catch (e) {
    console.error((e as Error).stack)
    return { messages: [] }
  }
}

const lints: Record<string, any> = Object.create(null)

const getLint = ((tern as any).getLint = function (name: string): any {
  if (!name) return null
  return lints[name]
})

function getRules(options: any): Rules {
  const rules: Rules = {}
  for (const ruleName in defaultRules) {
    if (
      options &&
      options.rules &&
      options.rules[ruleName] &&
      options.rules[ruleName].severity
    ) {
      if (options.rules[ruleName].severity != "none")
        rules[ruleName] = options.rules[ruleName]
    } else {
      rules[ruleName] = defaultRules[ruleName]
    }
  }
  return rules
}

function getRule(ruleName: string): Rule | undefined {
  const cx = infer.cx()
  const server = cx.parent as TernServer
  const rules =
    server && server._lint && server._lint.rules
      ? server._lint.rules
      : defaultRules
  return rules[ruleName]
}
