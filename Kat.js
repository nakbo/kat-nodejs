/**
 * @Package Kat
 * @Author 陆之岇(kraity)
 * @Studio 南博网络科技工作室
 * @GitHub https://github.com/krait-team/kat-php
 * @Version 1.0.0
 * @Description Data exchange format
 */

let Parser = require('./Parser');

module.exports = class Kat {
    /**
     *
     * @param object
     * @returns {string}
     */
    static encode(object) {
        return this._encode(null, object);
    }

    /**
     *
     * @param name
     * @param object
     * @returns {string}
     */
    static _encode(name, object) {
        let kat = [];
        this.__encode(kat, name, object);
        return kat.join('');
    }

    /**
     *
     * @param kat
     * @param name
     * @param object
     * @private
     */
    static __encode(kat, name, object) {
        if (object == null) {
            kat.push('n');
            if (name != null) {
                kat.push(':' + name);
            }
            kat.push('()');
        } else if (object instanceof Error) {
            kat.push('E');
            if (name != null) {
                kat.push(':' + name);
            }
            kat.push('{i:code(' + (object.code == null ? 0 : object.code) + ')s:msg(' + object.message + ')}');
        } else if (object instanceof Array) {
            kat.push('A');
            if (name != null) {
                kat.push(':' + name);
            }
            kat.push('{');
            for (let i = 0, len = object.length; i < len; i++) {
                this.__encode(kat, null, object[i]);
            }
            kat.push('}');
        } else if (object instanceof Object) {
            kat.push('M');
            if (name != null) {
                kat.push(':' + name);
            }
            kat.push('{');
            for (let key in object) {
                this.__encode(kat, key, object[key]);
            }
            kat.push('}');
        } else {
            switch (typeof object) {
                case 'string': {
                    kat.push('s');
                    if (name != null) {
                        kat.push(':' + name);
                    }
                    kat.push('(' + object.replace(/([()^])/g, "^$1") + ')');
                    break;
                }
                case 'number': {
                    let obj = object.toString(), larger = object > 2147483647;
                    kat.push(obj.indexOf('.') === -1 ? (larger ? 'l' : 'i') : (larger ? 'd' : 'f'));
                    if (name != null) {
                        kat.push(':' + name);
                    }
                    kat.push(`(${obj})`);
                    break;
                }
                case 'boolean': {
                    kat.push('b');
                    if (name != null) {
                        kat.push(':' + name);
                    }
                    kat.push('(' + (object ? '1' : '0') + ')');
                    break;
                }
                default: {
                    kat.push('n');
                    if (name != null) {
                        kat.push(':' + name);
                    }
                    kat.push('()');
                }
            }
        }
    }

    /**
     *
     * @param kat
     * @returns {*}
     */
    static decode(kat) {
        switch (kat.charCodeAt(0)) {
            case 91:
            case 123:
                return JSON.parse(kat);
        }
        let parser = new Parser();
        parser.read(kat);
        return parser.export();
    }
}