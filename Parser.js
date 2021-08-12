/**
 * @Package Kat
 * @Author 陆之岇(kraity)
 * @Studio 南博网络科技工作室
 * @GitHub https://github.com/krait-team/kat-php
 * @Version 1.0.0
 * @Description Data exchange format
 */

let Crash = require('./crash/Crash');

Array.prototype.rollout = function () {
    let string = String.fromCharCode.apply(this, this);
    this.splice(0, this.length);
    return string;
}

module.exports = class Parser {
    status;
    label;

    classes = [];
    spaces = [];
    aliases = [];

    stack = [];
    data = [];

    space = [];
    alias = [];
    symbol = [];

    static SPACE = 1;
    static ALIAS = 2;
    static SYMBOL = 3;

    /**
     *
     * @returns {*}
     */
    export() {
        return this.data.pop();
    }

    /**
     *
     * @returns {boolean}
     */
    empty() {
        return this.data.length === 0;
    }

    /**
     *
     * @param response
     */
    reread(response) {
        this.classes = [];
        this.stack = [];
        this.spaces = [];
        this.aliases = [];
        this.spaces = [];
        this.alias = [];
        this.symbol = [];
        this.read(response);
    }

    /**
     *
     * @param response
     */
    read(response) {
        this.startDoc();

        // init
        let offset = 0, length = response.length;

        // trim
        while ((offset < length) && (response.charCodeAt(offset) < 33)) {
            offset++;
        }
        while ((offset < length) && (response.charCodeAt(length - 1) < 33)) {
            length--;
        }

        // ergodic
        for (let pos = offset; pos < length; pos++) {
            let ch = response.charCodeAt(pos);
            // status
            switch (this.status) {
                case Parser.SYMBOL: {
                    switch (ch) {
                        case 41: {
                            this.enterStack(this.aliases.pop(), this.parseSymbol(
                                this.spaces.pop(), this.symbol.rollout()
                            ));
                            this.status = Parser.SPACE;
                            break;
                        }
                        case 94: {
                            let c = response.charCodeAt(++pos);
                            switch (c) {
                                case 40:
                                case 41:
                                case 94: {
                                    this.symbol.push(c);
                                }
                            }
                            break;
                        }
                        default: {
                            this.symbol.push(ch);
                        }
                    }
                    break;
                }
                case Parser.SPACE: {
                    switch (ch) {
                        case 123: {
                            this.status = Parser.SPACE;
                            this.startSpace(this.space.rollout(), this.alias.rollout());
                            break;
                        }
                        case 40: {
                            this.status = Parser.SYMBOL;
                            this.spaces.push(this.space.rollout());
                            this.aliases.push(this.alias.rollout());
                            break;
                        }
                        case 125: {
                            this.endSpace(this.spaces.pop(), this.aliases.pop());
                            this.status = Parser.SPACE;
                            break;
                        }
                        case 58: {
                            this.status = Parser.ALIAS;
                            break;
                        }
                        case 32:
                        case 9:
                        case 10:
                        case 13: {
                            break;
                        }
                        default: {
                            this.space.push(ch);
                        }
                    }
                    break;
                }
                case Parser.ALIAS: {
                    switch (ch) {
                        case 123: {
                            this.status = Parser.SPACE;
                            this.startSpace(this.space.rollout(), this.alias.rollout());
                            break;
                        }
                        case 40: {
                            this.status = Parser.SYMBOL;
                            this.spaces.push(this.space.rollout());
                            this.aliases.push(this.alias.rollout());
                            break;
                        }
                        case 94: {
                            pos++;
                            break;
                        }
                        default: {
                            this.alias.push(ch);
                        }
                    }
                }
            }
        }

        this.endDoc();
    }

    /**
     * @target doc
     */
    startDoc() {
        this.status = Parser.SPACE;
    }

    /**
     * @target doc
     */
    endDoc() {

    }

    /**
     *
     * @param clazz
     * @param alias
     */
    startSpace(clazz, alias) {
        this.spaces.push(clazz);
        this.aliases.push(alias);
        this.classes.push(clazz);
        switch (clazz) {
            case "L":
            case "A": {
                this.stack.push([]);
                break;
            }
            case "M": {
                this.stack.push({});
                break;
            }
            case "E": {
                this.stack.push(0);
                break;
            }
        }
    }

    /**
     *
     * @param clazz
     * @param alias
     */
    endSpace(clazz, alias) {
        this.classes.pop();
        switch (clazz) {
            case "M":
            case "L":
            case "A":
            case "E": {
                this.enterStack(alias, this.stack.pop());
                break;
            }
        }
    }

    /**
     *
     * @param clazz
     * @param val
     * @returns {null|string|boolean|number|*}
     */
    parseSymbol(clazz, val) {
        switch (clazz) {
            case "s":
                return val;
            case "b":
                return "1".equals(val);
            case "i":
            case "l":
                return parseInt(val);
            case "f":
            case "d":
                return parseFloat(val);
            case "n":
                return null;
            case "D":
                return val;
            case "B":
                return new Buffer(val, 'base64').toString();
        }
        return val;
    }

    /**
     *
     * @param alias
     * @param value
     */
    enterStack(alias, value) {
        let length = this.classes.length;
        if (length) {
            switch (this.classes[--length]) {
                case "M": {
                    let map = this.stack.pop();
                    map[alias] = value;
                    this.stack.push(map);
                    break;
                }
                case "A":
                case "L": {
                    let array = this.stack.pop();
                    array.push(value);
                    this.stack.push(array);
                    break;
                }
                case "E": {
                    switch (alias) {
                        case "code": {
                            this.stack.pop();
                            this.stack.push(value);
                            break;
                        }
                        case "msg": {
                            this.stack.push(new Crash(value, this.stack.pop()));
                        }
                    }
                }
            }
        } else {
            this.label = alias;
            this.data.push(value);
        }
    }
}