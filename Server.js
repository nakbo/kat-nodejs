/**
 * @Package Kat
 * @Author 陆之岇(kraity)
 * @Studio 南博网络科技工作室
 * @GitHub https://github.com/krait-team/kat-php
 * @Version 1.0.0
 * @Description Data exchange format
 */

let Kat = require('../kat/Kat');
let Crash = require('./crash/Crash');
const Parser = require("./Parser");

Array.prototype.contains = function (ele) {
    return this.indexOf(ele) !== -1;
}

module.exports = class Server {
    data = {
        method: 'error'
    };
    _service;
    _hookers = {};
    _ciphers = {};
    _methods = {};
    _metcips = [];

    /**
     *
     * @param Clazz
     * @param service
     */
    register(Clazz, service) {
        this._service = service;
        for (let name of Object.getOwnPropertyNames(Clazz.prototype)) {
            let method = name.substr(7);
            if (method === '') {
                continue;
            }
            switch (name.substr(0, 7)) {
                case 'metcip_': {
                    this._metcips.push(method);
                }
                case 'method_': {
                    this._methods[method] = name;
                    break;
                }
                case 'cipher_': {
                    this._ciphers[method] = name;
                    break;
                }
                case 'hooker_': {
                    this._hookers[method] = name;
                }
            }
        }
    }

    /**
     *
     * @param request
     */
    async launch(request) {
        try {
            // hook launch
            this.hook('launch', request);

            // check
            if (request === '') {
                throw new Crash('Kat server accepts POST requests only');
            }

            // read
            let parser = new Parser();
            parser.read(request);

            // check
            if (parser.empty()) {
                throw new Crash('error');
            }

            // data
            this.data = parser.export();

            // check method
            this.checkMethod(this.data.method);

            // hook before
            this.hook('before',
                this.data
            );

            // security
            if (this._metcips.contains(this.data.method)) {
                // ready
                this.cipher('ready',
                    this.data
                );

                // access
                await this.cipher('access',
                    this.data
                );

                // accept
                this.cipher('accept',
                    this.data
                );
            }

            // reread
            this.data.request = Kat.decode(
                this.data.request
            );

            // callback
            let callback = await this.callnc(
                this.data.method,
                this.data.request
            );

            // response
            this.onResponse(
                this.data.method,
                callback, 'kat'
            );
        } catch (error) {
            this.onError(
                this.data.method, error
            );
        }
    }

    /**
     *
     * @param method
     * @param args
     * @returns {*}
     */
    callMethod(method, args) {
        return this._service[method].apply(
            this._service, args
        );
    }

    /**
     *
     * @param method
     * @param args
     */
    callnc(method, ...args) {
        if (this._methods.hasOwnProperty(method)) {
            this.callMethod(
                this._methods[method], args
            )
        }
        throw new Crash('Server error, method does not exist', 406);
    }

    /**
     *
     * @param method
     * @param args
     * @returns {null|*}
     */
    cipher(method, ...args) {
        if (this._ciphers.hasOwnProperty(method)) {
            return this.callMethod(
                this._ciphers[method], args
            );
        }
        return null;
    }

    /**
     *
     * @param method
     * @param args
     * @returns {null|*}
     */
    hook(method, ...args) {
        if (this._hookers.hasOwnProperty(method)) {
            return this.callMethod(
                this._hookers[method], args
            );
        }
        return null;
    }

    /**
     *
     * @param method
     */
    checkMethod(method) {
        if (/^[0-9a-zA-Z_]{4,}$/.test(method) && this._methods.hasOwnProperty(method)) {
            return;
        }
        throw new Crash('Server error, method does not exist', 404);
    }

    /**
     *
     * @param method
     * @param response
     * @param name
     */
    onResponse(method, response, name = 'err') {
        // callback
        let callback = {
            method,
            response: Kat.encode(response)
        };

        // challenge
        if (this._metcips.contains(this.data.method)) {
            this.cipher('challenge',
                method, callback
            );
        }

        // encode
        let kat = Kat._encode(
            name, callback
        );

        // hook after
        this.hook('after',
            method, kat
        );

        // response
        this._service.response.writeHead(200, {
            "Content-Type": 'text/kat;charset=utf-8',
            "X-Powered-By": 'Kat/1.0.0'
        });
        this._service.response.end(kat);
    }

    /**
     *
     * @param method
     * @param error
     */
    onError(method, error) {
        this.onResponse(method, error,
            error.code > 100 ? 'kat' : 'err'
        );
    }
}