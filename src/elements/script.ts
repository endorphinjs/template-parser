import Scanner from '../scanner';
import { ParsedTag, ENDScript } from '../../ast/template';
import { tagText, getAttrValueIfLiteral } from './utils';

const defaultMIME = 'text/javascript';

export default function scriptStatement(scanner: Scanner, openTag: ParsedTag): ENDScript {
    const src = getAttrValueIfLiteral(openTag, 'src');
    const mime = getAttrValueIfLiteral(openTag, 'type');
    const text = tagText(scanner, openTag);
    const hasText = text && text.value && !/^\s+$/.test(text.value);

    if (src || hasText) {
        return new ENDScript(mime ? String(mime) : defaultMIME, hasText ? text : null, src ? String(src) : scanner.url);
    }
}
