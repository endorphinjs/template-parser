import { deepEqual } from 'assert';
import { parseJS, walk } from '../index';
import { Identifier, Program, IdentifierContext } from '../src/ast';

interface IdContextMap {
    [id: string]: IdentifierContext | void;
}

function collectIdContext(ast: Program): IdContextMap {
    const result: IdContextMap = {};
    walk(ast, {
        Identifier(node: Identifier) {
            result[node.name] = node.context;
        }
    });

    return result;
}

function getContext(expr: string): IdContextMap {
    return collectIdContext(parseJS(expr));
}

describe('JS Parser', () => {
    it('should detect identifier context', () => {
        deepEqual(getContext('foo[bar => bar > baz]'), {
            foo: 'property',
            bar: undefined,
            baz: 'property'
        });

        deepEqual(getContext('foo[({ bar }) => bar > baz]'), {
            foo: 'property',
            bar: undefined,
            baz: 'property'
        });

        deepEqual(getContext('foo[([bar, baz]) => bar > baz]'), {
            foo: 'property',
            bar: undefined,
            baz: undefined
        });
    });
});
