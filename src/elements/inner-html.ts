import Scanner from './scanner';
import { ENDInnerHTML } from '../ast/template';
import parseJS from './expression/js-parser';
import { EXPRESSION_START, EXPRESSION_END } from './expression';
import { eatQuoted, ESCAPE } from './utils';

/**
 * Consumes inner HTML expression
 * @param scanner
 * @param open Character code of pair opening
 * @param close Character code of pair closing
 */
export default function innerHTML(scanner: Scanner): ENDInnerHTML {
    const start = scanner.pos;

    if (scanner.eat(EXPRESSION_START) && scanner.eat(EXPRESSION_START)) {
        let stack = 0, ch: number;

        while (!scanner.eof()) {
            if (eatQuoted(scanner)) {
                continue;
            }

            ch = scanner.next();
            if (ch === EXPRESSION_START) {
                stack++;
            } else if (ch === EXPRESSION_END) {
                if (!stack) {
                    // Expecting the end of inner HTML expression
                    if (scanner.eat(EXPRESSION_END)) {
                        const expr = parseJS(scanner.substring(start + 2, scanner.pos - 2), scanner);
                        return scanner.astNode(new ENDInnerHTML(expr), start);
                    } else {
                        throw scanner.error(`Expecting ${String.fromCharCode(EXPRESSION_END).repeat(2)} at the end of inner HTML expression`);
                    }
                } else {
                    stack--;
                }
            } else if (ch === ESCAPE) {
                scanner.next();
            }
        }

        throw scanner.error(`Unable to find matching pair for ${String.fromCharCode(EXPRESSION_START).repeat(2)}`);
    }

    scanner.pos = start;
}
