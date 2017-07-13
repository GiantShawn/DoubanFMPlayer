import * as qs from 'querystring';
import * as http from 'http';
import * as lo from 'lodash';
import {SDK as SDKG} from './sdklib';



function DoubanFMSongList(cookies)
{
    this.q = [];
    this.fm = new SDKG().defineAPI('login', 'https', this.login_options)
                        .defineAPI('check_login', 'https', this.login_check_options, 'login')
                        .defineAPI('redheart', 'http', this.doubanfm_options, 'login')
                        .defineAPI('songlist', 'http', this.getsid_options, 'redheart')
                        .defineAPI('songinfo', 'http', this.getsonglist_options, 'redheart');
}

DoubanFMSongList.prototype = {
    constructor: DoubanFMSongList,
    login_options: {
        "method": "POST",
        "hostname": "accounts.douban.com",
        "path": "/j/popup/login/basic",
        "headers": {
            "accept": "text/javascript, text/html, application/xml, text/xml, */*",
            "origin": "https://douban.fm",
            "x-requested-with": "XMLHttpRequest",
            "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.115 Safari/537.36",
            "content-type": "application/x-www-form-urlencoded",
            "referer": "https://douban.fm/mine/hearts",
            "accept-encoding": "json",
            "accept-language": "en-US,en;q=0.8,zh-CN;q=0.6",
            "cache-control": "no-cache",
            "postman-token": "81083c84-e179-3825-fa69-3ae8e025ea9e"
        }
    },

    login_check_options: {
        "method": "GET",
        "hostname": "douban.fm",
        'path': "/j/check_loggedin?san=1",
        "headers": {
            "cookie": "{0}",
        }
    },

    doubanfm_options: {
        "hostname": "douban.fm",
        "path": "/j/v2/redheart/{0}",
        "headers": {
            'cookie': "{0}",
        },
    },

    getsid_options: {
        "method": "GET",
        "{path}": "basic",
    },

    getsonglist_options: {
        "method": "POST",
        "{path}": "songs",
    },



    enqueue(proc)
    {
        this.q.push(proc);
        if (this.q.length === 1)
            this._dequeue()
    },

    _dequeue()
    {
        if (this.q.length === 0)
            return;

        const proc = this.q[0];
        new Promise(proc).then(() => {
            this.q.shift();
            this._dequeue();
        }).catch(this.exception_handler.bind(this))
    },

    exception_handler(err)
    {
        console.error("Error:", err);
    },

    handle_response(apiname, options, body, action)
    {
        const proc = (rsv, rej) => {
            if (typeof options === 'function')
                options = options();

            this.fm.callAPI(apiname, options, body).then(
                function(res) {
                    var [req, res, body, usrdata] = res;
                    action(body.toString(), req, res);
                    rsv();
                }, rej);
            /*
            const final_options = lo.cloneDeep(options);
            final_options.headers.cookie = this.dbclids;
            console.log("Final options", final_options);
            //const final_options = lo.assign(options, {cookie: this.dbclids});
            let req = http.request(final_options,
                (res) => {
                    let chunks = [];
                    res.on("data", (ck) => {
                        chunks.push(ck);
                    });
                    res.on("error", rej);
                    res.on("end", () => {
                        let body = Buffer.concat(chunks);
                        action(body.toString());
                        rsv();
                    });
                });
            if (body && final_options.method.toLowerCase() === 'post') {
                if (typeof body === 'function')
                    body = body();
                req.write(body);
            }
            req.end();
            */

        }
        this.enqueue(proc);
    },

    __parseCookie(cks, nm)
    {
        for (let c of cks) {
            let ckele = c.slice(0, c.indexOf(';'));
            let [cknm, ckv] = ckele.split('=');
            if (cknm == nm)
                return ckv
        }
        throw Error(`No expected cookie[${nm}) found in [${cks}]`);
    },

    __joinCookie(cks)
    {
        return cks.join(';');
    },

    login(userinfo)
    {
        this.handle_response('login', null, qs.stringify(userinfo), (body, req, res) => {
            this.dbclid = this.__parseCookie(res.headers['set-cookie'], 'dbcl2')
            console.log("Login succeed", this.dbclid);
        });

        this.handle_response('check_login', () => { return {headers: {'{cookie}': 'dbcl2='+this.dbclid}}; }, null, (body, req, res) => {
            this.ckcode = this.__parseCookie(res.headers['set-cookie'], 'ck');
            console.log("CK-Code:", this.ckcode, this.dbclid, res.headers);
        });
    },
            
    getSongIDs()
    {
        const action = (body) => {
            const meta = JSON.parse(body);
            const songs = meta.songs;
            this.song_ids = [];
            for (let sidx in songs) {
                const sid = songs[sidx].sid;
                this.song_ids.push(sid);
            }

            console.log("song+ids", this.song_ids);

        }

        this.handle_response('songlist', () => {return {headers: {'{cookie}': 'dbcl2='+this.dbclid}}}, null, action);
    },

    getAllSongInfo()
    {
        const action = (body) => {
            const songs = JSON.parse(body);
            this.songs_meta = {};
            for (let sidx in songs) {
                const title = songs[sidx].title;
                const sid = songs[sidx].sid;
                const url = songs[sidx].url;
                this.songs_meta[sid] = {title : title, url: url };
            }
           console.log("Songs:", songs, this.songs_meta);
        }

        const get_post_body = () => {
            const post_body = {
                ck: this.ckcode,
                kbps: '192',
                sids: this.song_ids.join('|')
            };

            let qss = qs.stringify(post_body);
            console.log("QSS", qss);
            return qss;
        }

        this.handle_response('songinfo', () => {return {headers: {'{cookie}': 'dbcl2='+this.dbclid}}}, get_post_body, action);
    },
};

const argv = require('minimist')(process.argv.slice(2))
console.log('argv', argv, process.argv);
if (!argv.u || !argv.p) {
    console.error("-u <username> -p <password>");
    process.exit(1);
}
var sl = new DoubanFMSongList();
sl.login({name:argv.u, password:argv.p});
sl.getSongIDs();
sl.getAllSongInfo();
