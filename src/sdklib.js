'use strict';

const qs = require("querystring");
const http = require("https");
const https = require("https");
const lo = require('lodash');
const assert = require('assert');

/*
 * SDK represent a group of web api
 * and their bundled parameters
 */

export class SDK
{
    constructor()
    {
        this.apis = {};
        this.usrdata = {};
        this.defaultusrdata = {};
        return this;
    }

    defineAPI(name, proto, reqoptions, ext = null, usrdata = null)
    {
        if (!reqoptions)
            reqoptions = {}

        if (ext) {
            assert.notEqual(this.apis[ext], undefined);
            reqoptions = this.__optionsPatternReplace(this.apis[ext].options, reqoptions);
        }

        assert.equal(this.apis[name], undefined);

        this.apis[name] = {
            options: reqoptions,
            proto: proto === 'https' ? https : http,
        };

        if (usrdata) {
            this.defaultusrdata[name] = usrdata;
        }
        return this;
    }

    __optionsPatternReplace(dst, src)
    {
        if (!src)
            return dst;

        const abs_options = lo.omitBy(src, (v, k) => typeof(v) === 'object' || k[0] === '{' && k[k.length-1] === '}');
        const fm_options = lo.mapKeys(lo.pickBy(src, (v, k) => k[0] === '{' && k[k.length-1] === '}'), (v, k) => k.slice(1, -1));
        const obj_options = lo.pickBy(src, (v) => typeof(v) === 'object');
        //console.log("fm_options", fm_options, obj_options);
        let options = lo.defaultsDeep(abs_options, dst);
        for (let k in fm_options) {
            let v = fm_options[k];
            let h = options[k];
            if (!h) continue;
            if (typeof v === 'string')
                v = [v];
            for (let vi in v) {
                let vv = v[vi];
                h = h.replace(`{${vi}}`, vv);
            }
            options[k] = h;
        }

        for (let k in obj_options) {
            let v = obj_options[k];
            let vv = this.__optionsPatternReplace(options[k], v);
            options[k] = vv;
        }

        return options;
    }


    callAPI(name, params = null, body = null, usrdata = null)
    {
        let api = this.apis[name];
        if (!api) {
            console.error(`No API(${name}) defined`);
            return;
        }

        let options;

        if (params) {
            options = this.__optionsPatternReplace(api.options, params);
        } else {
            options = lo.clone(api.options);
        }

        if (!options.headers) {
            options.headers = {
                    // default header
                    "accept": "text/javascript, text/html, application/xml, text/xml, */*",
                    "x-requested-with": "XMLHttpRequest",
                    "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.115 Safari/537.36",
                    "content-type": "application/x-www-form-urlencoded",
                    "accept-encoding": "json",
                    "accept-language": "en-US,en;q=0.8,zh-CN;q=0.6",
                    "cache-control": "no-cache",
                };
        }

        return new Promise((rsv, rej) => {
            console.log(`OPTIONS ${name}`, options);
            let req = api.proto.request(options, (res) => {
                let chunks = [];
                res.on('data', (ck) => chunks.push(ck) );
                res.on('end', () => {
                    let data = Buffer.concat(chunks);

                    if (!usrdata)
                        usrdata = this.defaultusrdata[name];

                    rsv([req, res, data, usrdata])
                });
                res.on('error', (err) => {
                    if (!usrdata)
                        usrdata = this.defaultusrdata[name];

                    rej([req, res, err, usrdata]);
                });
            });
            if (body) {
                assert(['string', 'function'].indexOf(typeof body) >= 0);
                if (typeof body === 'function')
                    body = body();
                req.write(body);
            }
            req.end();
        });
    }
};


