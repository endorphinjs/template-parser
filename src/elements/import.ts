import { basename, dirname, extname } from 'path';
import Scanner from '../scanner';
import { Literal, ParsedTag, ENDImport, ENDAttribute } from '../ast';
import { expectAttributeLiteral, emptyBody, getAttr, assertLiteral } from './utils';

export default function importStatement(scanner: Scanner, openTag: ParsedTag): ENDImport {
    const href = stringValue(expectAttributeLiteral(scanner, openTag, 'href'));

    let tagName: string;
    const asAttr = getAttr(openTag, 'as');
    if (asAttr) {
        assertLiteral(scanner, asAttr);
        tagName = stringValue(asAttr);
    } else {
        // TODO provide overridable option to detect component name from import path
        const ext = extname(href);
        const fileName = basename(ext ? href.slice(0, -ext.length) : href);
        tagName = fileName.includes('-') ? fileName : basename(dirname(href));
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
