import { Parser, Position } from 'acorn';
import endorphinParser from './acorn-plugin';
import { Program, Identifier, Expression, Node } from '../ast';
import Scanner from '../scanner';
import { walkFullAncestor as walk } from '../walk';
import { eatPair, isIdentifier } from '../utils';
import { ENDSyntaxError } from '../syntax-error';

export const jsGlobals = new Set(['Math', 'String', 'Boolean', 'Object']);

// @ts-ignore
const JSParser = Parser.extend(endorphinParser);

interface ParserOptions {
    offset?: Position;
    url?: string;
    helpers?: string[];
}

export const EXPRESSION_START = 123; // {
export const EXPRESSION_END = 125; // }

/**
 * Consumes expression from current stream location
 */
export default function expression(scanner: Scanner): Program {
    if (eatPair(scanner, EXPRESSION_START, EXPRESSION_END)) {
        scanner.start++;
        const begin = scanner.start;
        const end = scanner.pos - 1;

        return parseJS(scanner.substring(begin, end), {
            url: scanner.url,
            offset: scanner.sourceLocation(begin)
        });
    }
}

/**
 * Parses given JS code into AST and prepares it for Endorphin expression evaluation
 * @param code Code to parse
 * @param scanner Code location inside parsed template
 * @param sourceFile Source file URL from which expression is parsed
 */
export function parseJS(code: string, options: ParserOptions = {}): Program {
    let ast: Program;
    try {
        ast = JSParser.parse(code, {
            sourceType: 'module',
            sourceFile: options.url,
            locations: true
        }) as Program;
    } catch (err) {
        const message = err.message.replace(/\s*\(\d+:\d+\)$/, '');
        const loc = { ...err.loc } as Position;
        if (options.offset) {
            offsetPos(loc, options.offset);
        }
        throw new ENDSyntaxError(message, options.url, loc, code);
    }

    // Walk over AST and validate & upgrade nodes
    walk(ast, (node: Node, state, ancestors: Expression[]) => {
        // Upgrade token locations
        if (options.offset) {
            node.start += options.offset.offset;
            node.end += options.offset.offset;
            if (node.loc) {
                offsetPos(node.loc.start, options.offset);
                offsetPos(node.loc.end, options.offset);
            }
        }

        if (isIdentifier(node)) {
            if (jsGlobals.has(node.name) || isReserved(node, ancestors)) {
                return;
            }

            switch (node.name[0]) {
                case '#':
                    node.context = 'state';
                    node.name = node.name.slice(1);
                    break;
                case '@':
                    node.context = 'variable';
                    node.name = node.name.slice(1);
                    break;
                case '$':
                    node.context = 'store';
                    node.name = node.name.slice(1);
                    break;
                default:
                    node.context = options.helpers && options.helpers.includes(node.name)
                        ? 'helper' : 'property';
            }
        }
    });

    return ast;
}

/**
 * Check if given identifier is reserved by outer scope
 */
function isReserved(id: Identifier, ancestors: Expression[]): boolean {
    const last = ancestors[ancestors.length - 1];

    if (!last) {
        return false;
    }

    if (isFunctionArgument(id, last) || isProperty(id, last) || isAssignment(id, last)) {
        return true;
    }

    // Check if given identifier is defined as function argument
    for (const ancestor of ancestors) {
        if (ancestor.type === 'FunctionDeclaration' || ancestor.type === 'ArrowFunctionExpression') {
            const hasArg = ancestor.params.some(param => param.type === 'Identifier' && param.name === id.name);
            if (hasArg) {
                return true;
            }
        }
    }
}

function offsetPos(pos: Position, offset: Position): Position {
    if (pos.line === 1) {
        pos.column += offset.column;
    }
    pos.line += offset.line - 1;
    if (typeof pos.offset === 'number') {
        pos.offset += offset.offset;
    }
    return pos;
}

/**
 * Check if given identifier is a function argument
 */
function isFunctionArgument(id: Identifier, expr: Expression): boolean {
    return (expr.type === 'FunctionDeclaration' || expr.type === 'ArrowFunctionExpression')
        && expr.params.includes(id);
}

/**
 * Check if given identifier is an object property
 */
function isProperty(id: Identifier, expr: Expression): boolean {
    return expr.type === 'MemberExpression' && expr.property === id;
}

/**
 * Check if given identifier is a left part of assignment expression
 */
function isAssignment(id: Identifier, expr: Expression): boolean {
    return 'left' in expr && expr.left === id;
}
