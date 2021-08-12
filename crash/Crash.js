/**
 * @Package Kat
 * @Author 陆之岇(kraity)
 * @Studio 南博网络科技工作室
 * @GitHub https://github.com/krait-team/kat-php
 * @Version 1.0.0
 * @Description Data exchange format
 */

module.exports = class Crash extends Error {
    code;

    constructor(msg, code = 0) {
        super(msg);
        this.code = code;
    }
}