import { Position } from 'acorn';
import { Node, Expression, ENDProgram, Program } from './ast';

export * from './ast';

export type AstWalker<T> = (node: Node, state: T, c: AstWalkerContinuation<T>) => void;
export type AstWalkerContinuation<T> = (node: Node, state: T, type?: string) => void;
export type AstVisitor<T, U> = (node: Node, state: T, addon: U) => void;
export type AstVisitorCallback<T> = (node: Node, state: T, type: string) => void;
export type AstAncestorVisitorCallback<T> = (node: Node, state: T, ancestors: Node[], type: string) => void;
export type AstTestFn = (type: string) => boolean;

export interface AstVisitors<T> {
    [nodeType: string]: AstWalker<T>;
}

export interface AstVisitorMap<T, U> {
    [nodeType: string]: AstVisitor<T, U>;
}

export interface ParserOptions {
    helpers?: string[];
    disableGetters?: boolean;
}

export interface JSParserOptions extends ParserOptions {
    offset?: Position;
    url?: string;
}

/**
 * Parses given Endorphin template text into AST
 * @param text Template source
 * @param url Location of source, used for source mapping
 */
export default function parse(code: string, url?: string, options?: ParserOptions): ENDProgram;

/**
 * Parses given Endorphin template text into AST
 * @param text Template source
 * @param url Location of source, used for source mapping
 */
export function parseJS(code: string, options?: JSParserOptions): Program;

/**
 * A simple walk is one where you simply specify callbacks to be
 * called on specific nodes. The last two arguments are optional. A
 * simple use would be
 *
 * ```js
 * walk.simple(myTree, {
 *     Expression(node) { ... }
 * });
 * ```
 *
 * to do something with all expressions. All Parser API node types
 * can be used to identify node types, as well as Expression and
 * Statement, which denote categories of nodes.
 *
 * The base argument can be used to pass a custom (recursive)
 * walker, and state can be used to give this walked an initial
 * state.
 */
export function walk<T>(node: Node, visitors: AstVisitorMap<T, void>, baseVisitor?: AstVisitors<T>, state?: T, override?: string): void;

/**
 * An ancestor walk keeps an array of ancestor nodes (including the
 * current node) and passes them to the callback as third parameter
 * (and also as state parameter when no other state is present).
 */
export function walkAncestor<T>(node: Node, visitors: AstVisitorMap<T, Expression[]>, baseVisitor?: AstVisitors<T>, state?: T): void;

/**
 * A recursive walk is one where your functions override the default
 * walkers. They can modify and replace the state parameter that's
 * threaded through the walk, and can opt how and whether to walk
 * their child nodes (by calling their third argument on these
 * nodes).
 */
export function walkRecursive<T>(node: Node, state?: T, funcs?: AstVisitors<T>, baseVisitor?: AstVisitors<T>, override?: string): void;

/**
 *  A full walk triggers the callback on each node
 */
export function walkFull<T>(node: Node, callback: AstVisitorCallback<T>, baseVisitor?: AstVisitors<T>, state?: T, override?: string): void;

/**
 * An fullAncestor walk is like an ancestor walk, but triggers
 * the callback on each node
 */
export function walkFullAncestor<T>(node: Node, callback: AstAncestorVisitorCallback<T>, baseVisitor?: AstVisitors<T>, state?: T): void;

/**
 * Find a node with a given start, end, and type (all are optional,
 * null can be used as wildcard). Returns a `{node, state}` object, or
 * `undefined` when it doesn't find a matching node.
 */
export function findNodeAt<T>(node: Node,
    start?: number | null,
    end?: number | null,
    test?: string | AstTestFn | null,
    baseVisitor?: AstVisitors<T>, state?: T): { node: Node, state: T };

/**
 * Find the innermost node of a given type that contains the given
 * position. Interface similar to `findNodeAt`.
 */
export function findNodeAround<T>(node: Node,
    pos: number,
    test: string | AstTestFn | null,
    baseVisitor?: AstVisitors<T>,
    state?: T): { node: Node, state: T };

/**
 * Find the outermost matching node after a given position.
 */
export function findNodeAfter<T>(node: Node, pos: number, test: string | AstTestFn | null, baseVisitor?: AstVisitors<T>, state?: T): { node: Node, state: T };

/**
 * Find the outermost matching node before a given position.
 */
export function findNodeBefore<T>(node: Node,
    pos: number,
    test: string | AstTestFn | null,
    baseVisitor?: AstVisitors<T>,
    state?: T): { node: Node, state: T };
