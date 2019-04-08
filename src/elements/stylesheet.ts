import Scanner from '../scanner';
import { ParsedTag, ENDStylesheet, Literal } from '../ast';
import { expectAttributeLiteral, emptyBody, tagText, getAttrValueIfLiteral, tagName } from './utils';

const defaultMIME = 'text/css';

export default function stylesheetStatement(scanner: Scanner, openTag: ParsedTag): ENDStylesheet {
    if (tagName(openTag) === 'link') {
        // Process <link rel="stylesheet" />
        const href = expectAttributeLiteral(scanner, openTag, 'href').value as Literal;
        emptyBody(scanner, openTag);

        return {
            type: 'ENDStylesheet',
            mime: getMIME(openTag),
            url: String(href.value).trim()
        };
    }

    // Process <style> tag
    const text = tagText(scanner, openTag);
    if (text && text.value && !/^\s+$/.test(String(text.value))) {
        return {
            type: 'ENDStylesheet',
            mime: getMIME(openTag),
            content: String(text.value),
            url: scanner.url
        }
    }
}

function getMIME(tag: ParsedTag): string {
    const mime = getAttrValueIfLiteral(tag, 'type');
    return mime ? String(mime).trim() : defaultMIME;
}
