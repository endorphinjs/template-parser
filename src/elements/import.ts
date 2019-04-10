import Scanner from '../scanner';
import { Literal, ParsedTag, ENDImport, ENDAttribute } from '../ast';
import { expectAttributeLiteral, getAttr, assertLiteral } from './utils';
import { emptyBody } from '../tag';

export default function importStatement(scanner: Scanner, openTag: ParsedTag): ENDImport {
    const href = stringValue(expectAttributeLiteral(scanner, openTag, 'href'));

    let tagName: string;
    const asAttr = getAttr(openTag, 'as');
    if (asAttr) {
        assertLiteral(scanner, asAttr);
        tagName = stringValue(asAttr);
    }

    emptyBody(scanner, openTag);
    return {
        type: 'ENDImport',
        name: tagName,
        href,
        ...scanner.loc(openTag.start)
    };
}

function stringValue(attr: ENDAttribute): string {
    return String((attr.value as Literal).value);
}
