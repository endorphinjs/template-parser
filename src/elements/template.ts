import Scanner from '../scanner';
import { ENDTemplate, ParsedTag, ENDPartial } from '../ast';
import { InnerStatement, tagBody, getDirective } from './utils';

/**
 * Consumes top-level <template> statement
 */
export default function templateStatement(scanner: Scanner, openTag: ParsedTag, next: InnerStatement): ENDTemplate | ENDPartial {
    const body = tagBody(scanner, openTag, next);
    const partial = getDirective(openTag, 'partial');

    if (partial) {
        return {
            type: 'ENDPartial',
            id: partial.name,
            params: openTag.attributes,
            body,
            loc: openTag.loc
        } as ENDPartial;
    }

    return {
        type: 'ENDTemplate',
        body,
        loc: openTag.loc
    } as ENDTemplate;
}
