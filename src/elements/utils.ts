import Scanner from '../scanner';
import { toCharCodes, eatSection, isSpace, literal, isLiteral, isIdentifier } from '../utils';
import { LiteralValue, ENDStatement, ENDAttribute, ParsedTag, ENDElement, ENDAttributeStatement, Node, Literal, ENDDirective } from '../ast';
import { closeTag, openTag } from '../tag';
import text from '../text';
import expression from '../expression';
import innerHTML from './inner-html';
import { ENDCompileError } from '../syntax-error';

const cdataOpen = toCharCodes('<![CDATA[');
const cdataClose = toCharCodes(']]>');
const commentOpen = toCharCodes('<!--');
const commentClose = toCharCodes('-->');
const piOpen = toCharCodes('<?');
const piClose = toCharCodes('?>');

/**
 * A prefix for Endorphin element and attribute names
 */
export const prefix = 'e';
const nsPrefix = prefix + ':';

export type InnerStatement = (scanner: Scanner, openTag: ParsedTag, next?: InnerStatement) => ENDStatement;

/**
 * Consumes tag content from given scanner into `body` argument
 */
export function tagBody(scanner: Scanner, open: ParsedTag, consumeTag?: InnerStatement, body: ENDStatement[] = []): ENDStatement[] {
    if (open.selfClosing) {
        // Nothing to consume in self-closing tag
        return;
    }

    const tagStack: ParsedTag[] = [open];
    const items: ENDStatement[] = [];
    let tagEntry: ParsedTag;
    let token: ENDStatement;

    while (!scanner.eof()) {
        if (closesTag(scanner, tagStack[tagStack.length - 1])) {
            tagStack.pop();
            if (!tagStack.length) {
                break;
            }
        } else if (tagEntry = openTag(scanner)) {
            if (consumeTag) {
                const inner = consumeTag(scanner, tagEntry);
                if (inner) {
                    items.push(inner);
                }
            } else {
                tagStack.push(tagEntry);
            }
        } else if (token = innerHTML(scanner) || expression(scanner)) {
            items.push(token);
        } else if (token = text(scanner)) {
            // Skip formatting tokens: a whitespace-only text token with new lines
            const value = String(token.value);
            if (!/^\s+$/.test(value) || !/[\r\n]/.test(value)) {
                items.push(token);
            }
        } else if (!ignored(scanner)) {
            throw scanner.error(`Unexpected token`);
        }
    }

    // If we reached here then most likely we have unclosed tags
    if (tagStack.length) {
        throw scanner.error(`Expecting </${tagName(tagStack.pop())}>`);
    }

    finalizeTagBody(body, items);
    return body;
}

/**
 * Consumes contents of given tag as text, e.g. parses it until it reaches closing
 * tag that matches `open`.
 */
export function tagText(scanner: Scanner, open: ParsedTag): Literal {
    if (open.selfClosing) {
        // Nothing to consume in self-closing tag
        return;
    }

    const start = scanner.pos;
    let end: number;
    let close: ParsedTag;

    while (!scanner.eof()) {
        end = scanner.pos;
        if (close = closeTag(scanner)) {
            if (tagName(close) === tagName(open)) {
                return literal(scanner.substring(start, end), null, scanner.loc(start, end));
            }
        } else {
            scanner.pos++;
        }
    }

    // If we reached here then most likely we have unclosed tags
    throw scanner.error(`Expecting </${tagName(open)}>`);
}

/**
 * Returns name of given parsed tag
 */
export function tagName(tag: ParsedTag): string {
    return tag.name.name;
}

/**
 * Consumes tag content and ensures it’s empty, e.g. no meaningful data in it,
 * or throw exception
 * @param scanner
 * @param open
 */
export function emptyBody(scanner: Scanner, open: ParsedTag): void {
    if (open.selfClosing) {
        // Nothing to consume in self-closing tag
        return;
    }

    while (!scanner.eof() && !closesTag(scanner, open)) {
        if (!ignored(scanner)) {
            throw scanner.error(`Unexpected token, tag <${tagName(open)}> must be empty`);
        }
    }
}

/**
 * Check if next token in current scanner state is a closing tag for given `open` one
 */
export function closesTag(scanner: Scanner, open: ParsedTag): boolean {
    const pos = scanner.pos;
    const close = closeTag(scanner);
    if (close) {
        if (tagName(close) === tagName(open)) {
            return true;
        }

        throw scanner.error(`Unexpected closing tag </${tagName(close)}>, expecting </${tagName(open)}>`, pos);
    }

    return false;
}

/**
 * Consumes XML sections that can be safely ignored by Endorphin
 */
export function ignored(scanner: Scanner, space?: boolean): boolean {
    return eatSection(scanner, cdataOpen, cdataClose)
        || eatSection(scanner, piOpen, piClose)
        || eatSection(scanner, commentOpen, commentClose, true)
        || (space && scanner.eatWhile(isSpace));
}

/**
 * Returns control statement name from given tag name if possible
 * @param name Tag name
 */
export function getControlName(name: string): string {
    if (name.startsWith(nsPrefix)) {
        return name.slice(nsPrefix.length);
    }

    if (name.startsWith('partial:')) {
        return 'partial';
    }

    return null;
}

/**
 * Returns attribute with given name from tag name definition, if any
 */
export function getAttr(elem: ParsedTag | ENDElement | ENDAttributeStatement, name: string): ENDAttribute {
    return elem.attributes.find(attr => isIdentifier(attr.name) && attr.name.name === name);
}

/**
 * Returns value of attribute with given name from tag name definition, if any
 */
export function getAttrValue(tag: ParsedTag | ENDElement | ENDAttributeStatement, name: string): LiteralValue {
    const attr = getAttr(tag, name);
    if (attr && isLiteral(attr.value)) {
        return attr.value.value;
    }
}

/**
 * Returns value of attribute with given name from tag name definition, if any
 */
export function getAttrValueIfLiteral(tag: ParsedTag, name: string): LiteralValue {
    const attr = getAttr(tag, name);
    if (attr) {
        if (isLiteral(attr.value)) {
            return attr.value.value;
        }

        throw new ENDCompileError(`Expecting literal value of ${name} attribute in <${tagName(tag)}> tag`, attr.value);
    }
}

/**
 * Returns directive with given prefix and name from tag name definition, if any
 */
export function getDirective(tag: ParsedTag, dirPrefix: string, name?: string): ENDDirective {
    return tag.directives.find(dir => dir.prefix === dirPrefix && (!name || dir.name === name));
}

/**
 * Returns list of all valid attributes from given tag, e.g. all attributes
 * except ones that have special meaning to Endorphin compiler
 */
export function getAttributes(tag: ParsedTag): ENDAttribute[] {
    return tag.attributes.filter(attr => isIdentifier(attr.name) ? !attr.name.name.startsWith(nsPrefix) : true);
}

/**
 * Check if `tag` element contains attribute with given name and returns it. If not,
 * throws exception
 */
export function expectAttribute(scanner: Scanner, tag: ParsedTag, name: string): ENDAttribute {
    const attr = getAttr(tag, name);
    if (!attr) {
        throw scanner.error(`Expecting "${name}" attribute in <${tagName(tag)}> element`, tag);
    }

    return attr;
}

export function expectAttributeExpression(scanner: Scanner, tag: ParsedTag, name: string): ENDAttribute {
    const attr = expectAttribute(scanner, tag, name);
    assertExpression(scanner, attr);
    return attr;
}

export function expectAttributeLiteral(scanner: Scanner, tag: ParsedTag, name: string): ENDAttribute {
    const attr = expectAttribute(scanner, tag, name);
    assertLiteral(scanner, attr);
    return attr;
}

/**
 * Check if value of given attribute is an expression. If not, throws exception
 */
export function assertExpression(scanner: Scanner, attr: ENDAttribute | ENDDirective): void {
    if (attr.value.type !== 'Program') {
        let attrName: string;
        if (attr.type === 'ENDDirective') {
            attrName = `${attr.prefix}:${attr.name}`;
        } else if (isIdentifier(attr.name)) {
            attrName = attr.name.name;
        }

        throw scanner.error(`Expecting expression as${attrName ? ` "${attrName}"` : ''} attribute value`, attr);
    }
}

/**
 * Check if value of given attribute is a literal. If not, throws exception
 */
export function assertLiteral(scanner: Scanner, attr: ENDAttribute): void {
    if (!isLiteral(attr.value)) {
        const attrName: string = isIdentifier(attr.name) ? attr.name.name : null;
        throw scanner.error(`Expecting string literal as${attrName ? ` "${attrName}"` : ''} attribute value`, attr);
    }
}

/**
 * Finalizes parsed body content
 */
function finalizeTagBody(parent: ENDStatement[], parsed: ENDStatement[]): void {
    removeFormatting(parsed).forEach(item => parent.push(item));
}

/**
 * Removes text formatting from given list of statements
 */
function removeFormatting(statements: ENDStatement[]): ENDStatement[] {
    return statements.filter((node, i) => {
        if (isLiteral(node) && /[\r\n]/.test(String(node.value)) && /^\s+$/.test(String(node.value))) {
            // Looks like insignificant white-space character, check if we can
            // remove it
            return isContentNode(statements[i - 1]) || isContentNode(statements[i + 1]);
        }

        return true;
    });
}

function isContentNode(node: Node): boolean {
    return isLiteral(node) || node.type === 'Program';
}
