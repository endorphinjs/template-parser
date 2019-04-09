import Scanner from '../scanner';
import { ENDPartialStatement, ParsedTag } from '../ast';
import { tagBody, getAttributes, tagName } from './utils';
import { identifier } from '../utils';

const prefix = 'partial:';

/**
 * Consumes <partial> statement
 * @param scanner
 * @param openTag
 */
export default function partialStatement(scanner: Scanner, openTag: ParsedTag): ENDPartialStatement {
    const name = tagName(openTag).slice(prefix.length);
    const start = openTag.name.loc.start.offset;
    const id = identifier(name, scanner.loc(start + prefix.length, start + prefix.length + name.length));

    // Ignore partial content, if any
    tagBody(scanner, openTag);

    return {
        type: 'ENDPartialStatement',
        id,
        params: getAttributes(openTag),
        ...scanner.loc(openTag.start)
    };
}
