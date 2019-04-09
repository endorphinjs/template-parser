import expression, { EXPRESSION_START } from './expression';
import {
    Identifier, Literal, Program, LiteralValue, ENDAttribute,
    ENDAttributeValue, ParsedTag, ENDAttributeName, ENDAttributeValueExpression,
    ENDBaseAttributeValue, ENDDirective
} from './ast';
import { isWhiteSpace, isQuote, eatQuoted, isAlpha, isNumber, isSpace, identifier, literal } from './utils';
import { prefix } from './elements/utils';
import Scanner from './scanner';

export const TAG_START = 60; // <
export const TAG_END = 62; // >
export const TAG_CLOSE = 47; // /
export const ATTR_DELIMITER = 61; // =
export const NAMESPACE_DELIMITER = 58; // :
export const DASH = 45; // -
export const DOT = 46; // .
export const UNDERSCORE = 95; // _

const exprStart = String.fromCharCode(EXPRESSION_START);
const directives = [prefix, 'on', 'ref', 'class', 'partial', 'animate'];

/**
 * Consumes tag from current stream location, if possible
 */
export default function parseTag(scanner: Scanner): ParsedTag {
    return openTag(scanner) || closeTag(scanner);
}

/**
 * Consumes open tag from given stream
 */
export function openTag(scanner: Scanner): ParsedTag {
    const pos = scanner.pos;
    if (scanner.eat(TAG_START)) {
        const name = ident(scanner);
        if (name) {
            const attributes = consumeAttributes(scanner);
            const selfClosing = scanner.eat(TAG_CLOSE);

            if (!scanner.eat(TAG_END)) {
                throw scanner.error('Expected tag closing brace');
            }

            scanner.start = pos;
            const tag = createTag(scanner, name, 'open', selfClosing);
            attributes.forEach(attr => {
                const directive = getDirective(attr);
                if (directive) {
                    tag.directives.push(directive);
                } else {
                    // Validate some edge cases:
                    // * Currently, we do not support dynamic names in slots.
                    //   Make sure all slot names are literals
                    const attrName = attr.name.type === 'Identifier' ? attr.name.name : null;
                    const shouldValidateSlot = attrName === (name.name === 'slot' ? 'name' : 'slot');

                    if (shouldValidateSlot && attr.value && attr.value.type !== 'Literal') {
                        // tslint:disable-next-line:max-line-length
                        throw scanner.error(`Slot name must be a string literal, expressions are not supported`, attr.value);
                    }

                    tag.attributes.push(attr);
                }
            });

            return tag;
        }
    }

    scanner.pos = pos;
}

/**
 * Consumes close tag from given stream
 */
export function closeTag(scanner: Scanner): ParsedTag {
    const pos = scanner.pos;
    if (scanner.eat(TAG_START) && scanner.eat(TAG_CLOSE)) {
        const name = ident(scanner);
        if (name) {
            if (!scanner.eat(TAG_END)) {
                throw scanner.error('Expected tag closing brace');
            }

            return createTag(scanner, name, 'close');
        }

        throw scanner.error('Unexpected character');
    }

    scanner.pos = pos;
}

/**
 * Check if given character can be used as a name start of tag name or attribute
 */
export function nameStartChar(ch: number): boolean {
    return isAlpha(ch) || ch === UNDERSCORE || ch === NAMESPACE_DELIMITER;
}

/**
 * Check if given character can be used as a tag name
 */
function nameChar(ch: number): boolean {
    return nameStartChar(ch) || isNumber(ch) || ch === DASH || ch === DOT;
}

/**
 * Returns `true` if valid XML identifier was consumed. If succeeded, sets stream
 * range to consumed data
 */
function ident(scanner: Scanner): Identifier {
    const start = scanner.pos;
    if (scanner.eat(nameStartChar)) {
        scanner.start = start;
        scanner.eatWhile(nameChar);

        return identifier(scanner.current(), scanner.loc());
    }
}

/**
 * Consumes attributes from current stream start
 */
function consumeAttributes(scanner: Scanner): ENDAttribute[] {
    const attributes: ENDAttribute[] = [];
    let attr: ENDAttribute;
    while (!scanner.eof()) {
        scanner.eatWhile(isSpace);

        if (attr = attribute(scanner)) {
            attributes.push(attr);
        } else if (!scanner.eof() && !isTerminator(scanner.peek())) {
            throw scanner.error('Unexpected attribute name');
        } else {
            break;
        }
    }

    return attributes;
}

/**
 * Consumes attribute from current stream location
 */
function attribute(scanner: Scanner): ENDAttribute {
    const name: ENDAttributeName = ident(scanner) || expression(scanner);
    const start = scanner.pos;
    if (name) {
        let value: ENDAttributeValue = null;

        if (scanner.eat(ATTR_DELIMITER)) {
            value = scanner.expect(attributeValue, 'Expecting attribute value');
        }

        return scanner.ast({
            type: 'ENDAttribute',
            name,
            value,
            start
        } as ENDAttribute);
    }
}

/**
 * Consumes attribute value from current stream location
 * @param {StreamReader} scanner
 * @return {Token}
 */
function attributeValue(scanner: Scanner): ENDAttributeValue {
    const expr = expression(scanner);
    if (expr) {
        return expandExpression(expr);
    }

    const start = scanner.pos;

    if (eatQuoted(scanner)) {
        // Check if it’s interpolated value, e.g. "foo {bar}"
        const raw = scanner.current();
        if (raw.includes(exprStart)) {
            const attrExpression = attributeValueExpression(scanner.limit(scanner.start + 1, scanner.pos - 1));
            if (attrExpression.elements.length === 1) {
                return attrExpression.elements[0];
            }

            return {
                ...attrExpression,
                ...scanner.loc(start)
            };
        }

        return literal(raw.slice(1, -1), raw, scanner.loc(start));
    }

    if (scanner.eatWhile(isUnquoted)) {
        scanner.start = start;
        const value = scanner.current();
        return literal(castAttributeValue(value), value, scanner.loc(start));
    }
}

/**
 * Parses interpolated attribute value from current scanner context
 */
function attributeValueExpression(scanner: Scanner): ENDAttributeValueExpression {
    let start = scanner.start;
    let pos = scanner.start;
    let expr: Program;
    const elements: ENDBaseAttributeValue[] = [];

    while (!scanner.eof()) {
        pos = scanner.pos;
        if (expr = expression(scanner)) {
            if (pos !== start) {
                const text = scanner.substring(start, pos);
                elements.push(literal(text, text, scanner.loc(start)));
            }
            elements.push(expr);
            start = scanner.pos;
        } else {
            scanner.pos++;
        }
    }

    if (start !== scanner.pos) {
        const text = scanner.substring(start, scanner.pos);
        elements.push(literal(text, text, scanner.loc(start)));
    }

    return {
        type: 'ENDAttributeValueExpression',
        elements,
        ...scanner.loc()
    } as ENDAttributeValueExpression;
}

/**
 * Check if given code is tag terminator
 */
function isTerminator(code: number): boolean {
    return code === TAG_END || code === TAG_CLOSE;
}

/**
 * Check if given character code is valid unquoted value
 */
function isUnquoted(code: number): boolean {
    return !isNaN(code) && !isQuote(code) && !isWhiteSpace(code)
        && !isTerminator(code) && code !== ATTR_DELIMITER && code !== EXPRESSION_START;
}

/**
 * If given attribute is a directive (has one of known prefixes), converts it to
 * directive token, returns `null` otherwise
 */
function getDirective(attr: ENDAttribute): ENDDirective {
    if (attr.name.type === 'Identifier') {
        const m = attr.name.name.match(/^([\w-]+):/);

        if (m && directives.includes(m[1])) {
            const pfx = m[1];
            const { name, loc } = attr.name;
            const directiveId = identifier(name.slice(m[0].length), {
                start: attr.name.start + m[0].length,
                end: attr.name.end,
                loc: {
                    ...loc,
                    start: {
                        ...loc.start,
                        column: loc.start.column + m[0].length
                    }
                }
            });

            return {
                type: 'ENDDirective',
                prefix: pfx,
                name: directiveId.name,
                value: attr.value,
                loc: attr.name.loc
            };
        }
    }
}

/**
 * Detects if given expression is a single literal and returns it
 */
function expandExpression(expr: Program): Program | Literal {
    const inner = expr.body && expr.body[0];
    if (inner && inner.type === 'ExpressionStatement' && inner.expression.type === 'Literal') {
        return inner.expression;
    }

    return expr;
}

function castAttributeValue(value: string): LiteralValue {
    // Cast primitive values
    if (/^\d+$/.test(value)) {
        return Number(value);
    }

    if (/^\d*\.\d+$/.test(value)) {
        return parseFloat(value);
    }

    if (value === 'true') {
        return true;
    }

    if (value === 'false') {
        return false;
    }

    if (value === 'null') {
        return null;
    }

    if (value === 'undefined') {
        return undefined;
    }

    return value;
}

function createTag(scanner: Scanner,
                   name: Identifier,
                   tagType: 'open' | 'close',
                   selfClosing: boolean = false): ParsedTag {
    return scanner.ast({
        type: 'ParsedTag',
        name,
        tagType,
        selfClosing,
        attributes: [],
        directives: [],
    } as ParsedTag);
}
