import Scanner from '../scanner';
import { ENDVariableStatement, ENDVariable, ParsedTag, ENDAttribute } from '../ast';
import { emptyBody } from '../tag';

/**
 * Consumes <variable> statement
 * @param scanner
 * @param openTag
 */
export default function variableStatement(scanner: Scanner, openTag: ParsedTag): ENDVariableStatement {
    emptyBody(scanner, openTag);
    return {
        type: 'ENDVariableStatement',
        variables: openTag.attributes.map(attrToVariable),
        loc: openTag.loc
    };
}

function attrToVariable(attr: ENDAttribute): ENDVariable {
    return {
        type: 'ENDVariable',
        name: attr.name,
        value: attr.value,
        loc: attr.loc
    };
}
