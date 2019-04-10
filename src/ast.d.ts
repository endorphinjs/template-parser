interface Position {
    line: number;
    column: number;
    offset: number
}

export interface SourceLocation {
    start: Position
    end: Position
    source?: string | null
}

export interface Node {
    type: string;
    start?: number;
    end?: number;
    loc?: SourceLocation;
    sourceFile?: string;
}

// AST types for JavaScript-like expressions
type JSNode = Node;

export type ArgumentListElement = Expression | SpreadElement;
export type ArrayExpressionElement = Expression | SpreadElement | null;
export type ArrayPatternElement = AssignmentPattern | BindingPattern | RestElement | null;
export type BindingPattern = ArrayExpression | ObjectExpression | Identifier;
export type Expression = ArrayExpression | ArrowFunctionExpression | AssignmentExpression
    | BinaryExpression | LogicalExpression | CallExpression | MemberExpression | ConditionalExpression
    | Identifier | Literal | ThisExpression | ObjectExpression | RegExpLiteral | SequenceExpression
    | UnaryExpression | UpdateExpression | FunctionDeclaration | ArrowFunctionExpression
    | AssignmentPattern;
export type FunctionParameter = AssignmentPattern | BindingPattern;
export type ObjectExpressionProperty = Property | SpreadElement;
export type ObjectPatternProperty = Property | RestElement;
export type Statement = ReturnStatement | EmptyStatement | ExpressionStatement;
export type PropertyKey = Identifier | Literal;
export type PropertyValue = BindingPattern | Literal;
export type LiteralValue = boolean | number | string | null;

export interface Function {
    generator?: boolean;
}

export interface Program extends JSNode {
    type: 'Program';
    raw: string;
    body: Statement[];
}

export interface Literal extends JSNode {
    type: 'Literal';
    value: LiteralValue;
    raw?: string;
}

export interface Identifier extends JSNode {
    type: 'Identifier';
    name: string;

    // Endorphin extension: identifier context
    context?: 'property' | 'state' | 'variable' | 'store' | 'helper';
}

export interface ThisExpression extends JSNode {
    type: 'ThisExpression';
}

export interface FunctionDeclaration extends Function {
    type: 'FunctionDeclaration';
    id: Identifier;
    params: FunctionParameter[];
    body: BlockStatement | Expression;
}

export interface AssignmentPattern extends JSNode {
    type: 'AssignmentPattern';
    left: Expression;
    right: Expression;
}

export interface SpreadElement extends JSNode {
    type: 'SpreadElement';
    argument: Expression;
}

export interface RestElement extends JSNode {
    type: 'RestElement';
    argument: BindingPattern;
}

export interface ArrayExpression extends JSNode {
    type: 'ArrayExpression';
    elements: ArrayPatternElement[];
}

export interface ObjectExpression extends JSNode {
    type: 'ObjectExpression';
    properties: Property[];
}

export interface Property extends JSNode {
    type: 'Property';
    kind: 'init' | 'get' | 'set';
    key: PropertyKey;
    value: Expression;
    computed?: boolean;
    method?: boolean;
    shorthand?: boolean;
}

export interface ArrowFunctionExpression extends Function {
    type: 'ArrowFunctionExpression';
    id: Identifier | null;
    params: FunctionParameter[];
    body: BlockStatement | Expression;
    expression?: boolean;
    async?: boolean;
}

interface BaseExpression extends JSNode {
    left: Expression;
    operator: string;
    right: Expression;
}

export interface AssignmentExpression extends BaseExpression {
    type: 'AssignmentExpression';
}

export interface BinaryExpression extends BaseExpression {
    type: 'BinaryExpression';
}

export interface LogicalExpression extends BaseExpression {
    type: 'LogicalExpression';
}

export interface CallExpression extends JSNode {
    type: 'CallExpression';
    callee: Expression;
    arguments: ArgumentListElement[];
}

export interface MemberExpression extends JSNode {
    type: 'MemberExpression';
    object: Expression;
    property: Expression;
    computed?: boolean;
}

export interface ConditionalExpression extends JSNode {
    type: 'ConditionalExpression';
    test: Expression;
    consequent: Expression;
    alternate: Expression;
}

export interface RegExpLiteral extends JSNode {
    type: 'RegExpLiteral';
    regex: { pattern: string, flags: string };
}

export interface SequenceExpression extends JSNode {
    type: 'SequenceExpression';
    expressions: Expression[];
}

export interface UnaryExpression extends JSNode {
    type: 'UnaryExpression';
    prefix?: boolean;
    operator: string;
    argument: Expression;
}

export interface UpdateExpression extends JSNode {
    type: 'UpdateExpression';
    operator: string;
    argument: Expression;
    prefix: boolean;
}

export interface ExpressionStatement extends JSNode {
    type: 'ExpressionStatement';
    expression: Expression;
}

export interface EmptyStatement extends JSNode {
    type: 'EmptyStatement';
}

export interface ReturnStatement extends JSNode {
    type: 'ReturnStatement';
    argument: Expression | null;
}

export interface BlockStatement extends JSNode {
    type: 'BlockStatement';
    body: Statement[];
}

// Endorphin template AST
type ENDNode = Node;

export type ENDStatement = ENDElement | ENDInnerHTML | ENDPlainStatement
    | ENDAttributeStatement | ENDAddClassStatement | ENDVariableStatement
    | ENDControlStatement | ENDPartialStatement;
export type ENDProgramStatement = ENDTemplate | ENDPartial | ENDImport | ENDStatement;
export type ENDControlStatement = ENDIfStatement | ENDChooseStatement | ENDForEachStatement | ENDPartialStatement;
export type ENDPlainStatement = Literal | Program;
export type ENDAttributeName = Identifier | Program;
export type ENDBaseAttributeValue = Literal | Program;
export type ENDAttributeValue = ENDBaseAttributeValue | ENDAttributeValueExpression | null;

export interface ENDProgram extends ENDNode {
    type: 'ENDProgram';
    filename?: string;
    body: ENDProgramStatement[];
    stylesheets: ENDStylesheet[];
    scripts: ENDScript[];
}

export interface ENDTemplate extends ENDNode {
    type: 'ENDTemplate';
    body: ENDStatement[];
}

export interface ENDPartial extends ENDNode {
    type: 'ENDPartial';
    id: string;
    body: ENDStatement[];
    params: ENDAttribute[];
}

export interface ENDElement extends ENDNode {
    type: 'ENDElement';
    name: Identifier;
    attributes: ENDAttribute[];
    directives: ENDDirective[];
    body: ENDStatement[];
}

export interface ENDAttribute extends ENDNode {
    type: 'ENDAttribute';
    name: ENDAttributeName;
    value: ENDAttributeValue;
}

export interface ENDDirective extends ENDNode {
    type: 'ENDDirective';
    prefix: string;
    name: string;
    value: ENDAttributeValue;
}

export interface ENDAttributeValueExpression extends ENDNode {
    type: 'ENDAttributeValueExpression';
    elements: ENDBaseAttributeValue[];
}

export interface ENDVariable extends ENDNode {
    type: 'ENDVariable';
    name: ENDAttributeName;
    value: ENDAttributeValue;
}

export interface ENDIfStatement extends ENDNode {
    type: 'ENDIfStatement';
    consequent: ENDStatement[];
    test: Program;
}

export interface ENDChooseStatement extends ENDNode {
    type: 'ENDChooseStatement';
    cases: ENDChooseCase[];
}

export interface ENDChooseCase extends ENDNode {
    type: 'ENDChooseCase';
    test: Program | null;
    consequent: ENDStatement[];
}

export interface ENDForEachStatement extends ENDNode {
    type: 'ENDForEachStatement';
    readonly body: ENDStatement[];
    select: Program;
    key?: Program;
}

export interface ENDPartialStatement extends ENDNode {
    type: 'ENDPartialStatement';
    id: Identifier;
    params: ENDAttribute[];
}

export interface ENDVariableStatement extends ENDNode {
    type: 'ENDVariableStatement';
    variables: ENDVariable[];
}

export interface ENDAttributeStatement extends ENDNode {
    type: 'ENDAttributeStatement';
    attributes: ENDAttribute[];
    directives: ENDDirective[];
}

export interface ENDAddClassStatement extends ENDNode {
    type: 'ENDAddClassStatement';
    tokens: ENDPlainStatement[];
}

export interface ENDInnerHTML extends ENDNode {
    type: 'ENDInnerHTML';
    value: Program;
}

export interface ENDImport extends ENDNode {
    type: 'ENDImport';
    name: string;
    href: string;
}

export interface ENDStylesheet extends ENDNode {
    type: 'ENDStylesheet';
    mime: string;
    transformed?: string;
    content?: string;
    url?: string;
}

export interface ENDScript extends ENDNode {
    type: 'ENDScript';
    transformed?: string;
    mime: string;
    content?: string;
    url?: string;
}

export interface ParsedTag extends Node {
    type: 'ParsedTag';
    name: Identifier;
    attributes: ENDAttribute[];
    directives: ENDDirective[];
    tagType: 'open' | 'close';
    selfClosing?: boolean;
}
