
import * as colors from "colors/safe";
import * as fs from 'fs';

const color_theme = {
        error: ['bold', 'red'],
            assert: ['bold', 'red'],
                warning: ['bold', 'magenta'],
                    imp: ['bgBlue', 'yellow'],
        tips: 'cyan',
        info: 'white',
        debug: 'grey',
};
colors.setTheme(color_theme);

const colors_default = colors.default;
export {colors_default as color_fmt};

for (let et in color_theme) {
    (function (et) {
        exports['log'+et] = function (fmt, ...args) {
            //console.log(Object.keys(colors));
            console.log(colors_default[et](fmt), ...args);
        }
    })(et);
}


export function parseAddrSpec(spec, daddr, dport)
{
    if (!spec)
        return [daddr, parseInt(dport)];

    const colon = spec.indexOf(':');
    const addr = spec.slice(0, colon) || daddr;
    const port = spec.slice(colon+1) || dport;
    return [addr, parseInt(port)];
}

