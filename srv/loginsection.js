import 'babel-polyfill';
import * as qs from 'querystring';
import * as http from 'http';
import * as lo from 'lodash';
import { SDKPackage } from './sdklib';
import * as utils from '../lib/utils';
import * as fsco from 'mz/fs';
import co from 'co';
import through2 from 'through2';
import * as util from 'util';


function DoubanFMSongList(cookies)
{
    this.q = [];
    this.fm = new SDKPackage().defineAPI('login', 'https', this.login_options)
                        .defineAPI('check_login', 'https', this.login_check_options, 'login')
                        .defineAPI('redheart', 'https', this.doubanfm_options, 'login')
                        .defineAPI('songlist', 'https', this.songlist_options, 'redheart')
                        .defineAPI('songinfo', 'https', this.songinfo_options, 'redheart')
                        .defineAPI('logout', 'http', this.logout_options, 'login');
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
        "hostname": "douban.fm",
        "method": "GET",
        'path': "/j/check_loggedin?san=1",
        "headers": {
            "cookie": "dbcl2={0}",
        }
    },

    doubanfm_options: {
        "hostname": "douban.fm",
        "path": "/j/v2/redheart/{0}",
        "headers": {
            'cookie': "dbcl2={0}",
        },
    },

    songlist_options: {
        "method": "GET",
        "{path}": "basic",
    },

    songinfo_options: {
        "method": "POST",
        "{path}": "songs",
    },

    logout_options: {
        "hostname": "douban.fm",
        "method": "GET",
        "path": "/partner/logout?source=radio&ck={0}&no_login=y",
        "headers": {
            'upgrade-insecure-requests': "1",
            'cookie': "dbcl2={0}"
        }
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
                }).catch(rej);
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
        this.handle_response('login', null, qs.stringify(userinfo),
            (body, req, res) => {
                if (res.statusCode === 200) {
                    this.dbclid = this.__parseCookie(res.headers['set-cookie'], 'dbcl2')
                    //utils.logtips("Login succeed", this.dbclid);
                } else {
                    utils.logerror("Login fail", res.statusCode);
                    res.pipe(process.stdout);
                }
        });

        this.handle_response('check_login', () => { return {headers: {'{cookie}': this.dbclid}}; }, null,
            (body, req, res) => {
                this.ckcode = this.__parseCookie(res.headers['set-cookie'], 'ck');
                //console.log("CK-Code:", this.ckcode, this.dbclid, res.headers);
            });
    },

    logout()
    {
        this.handle_response('logout', () => { return {'{path}': this.ckcode, headers: {'{cookie}': this.dbclid}};}, null,
            (body, req, res) => {
                //console.log("Logout", res.statusCode, res.headers);
            });
    },
            
    getSongIDs()
    {
        const action = (body) => {
            //utils.loginfo(body);
            const meta = JSON.parse(body);
            const songs = meta.songs;
            this.song_ids = [];
            for (let sidx in songs) {
                const sid = songs[sidx].sid;
                this.song_ids.push(sid);
            }

            //console.log("song+ids", this.song_ids);

        }

        this.handle_response('songlist', () => {return {headers: {'{cookie}': this.dbclid}}}, null, action);
    },

    getAllSongInfo()
    {
        const get_post_body = () => {
            const post_body = {
                ck: this.ckcode,
                kbps: '192',
                sids: this.song_ids.join('|')
            };

            let qss = qs.stringify(post_body);
            //console.log("QSS", qss);
            return qss;
        }

        return new Promise((rsv, rej) => {
            this.handle_response('songinfo', () => {return {headers: {'{cookie}': this.dbclid}}}, get_post_body,
                (body) => {
                    const songs = JSON.parse(body);
                    this.songs_meta = {}
                    this.songs_meta[Symbol.iterator] = function* () {
                        for (let si in this) {
                            yield this[si];
                        }
                    }.bind(this.songs_meta)
                    for (let sidx in songs) {
                        const title = songs[sidx].title;
                        const sid = songs[sidx].sid;
                        const url = songs[sidx].url;
                        const sha256 = songs[sidx].sha256;
                        this.songs_meta[sid] = {title : title, url: url, sha256: sha256};
                    }
                   //console.log("Songs:", songs);
                   for (let s of this.songs_meta) {
                       console.log('<%s>[%s]{%s}', s.title, s.url, s.sha256);
                   }

                    rsv();
                });
        });
    },

    downloadAllSongs()
    {
        let songsiter = this.songs_meta[Symbol.iterator]();
        const max_concurrency = 10;
        let concurrency = 0;

        const that = this;
        let downloadSong = co.wrap(function* () {
            while (true) {
                const {value, done} = songsiter.next();
                if (done) return;
                yield co(function* (title, url, sha256) {
                    if (that.local_songs[title] && that.local_songs[title] === sha256) {
                        utils.loginfo("Song %s has already been downloaded", title);
                        return;
                    }

                    yield new Promise((rsv, rej) => {
                        http.get(url, function (res) {
                            if (res.statusCode !== 200) {
                                utils.logerror("Song(%s) with url %s does not exists!", title, url);
                                res.pipe(through2((ck, enc, cb) => cb())).on('end', rsv).on('error', rej); // swallow body
                                return;
                            }

                            utils.loginfo("Write song:", title);
                            res.pipe(fsco.createWriteStream(util.format('%s.mp3', title))
                                .on('finish', rsv)
                                .on('error', rej));
                        });
                    });

                    utils.loginfo("Writing song finish:", title);
                }, value.title, value.url, value.sha256);
            }
        });

        co(function* () {
            that.local_songs = JSON.parse(yield fsco.readFile('local_songs.json'));
            utils.logtips("Download starts", that.local_songs);
            let downs = [];
            for (let concurrency = 0; concurrency < max_concurrency; ++concurrency) {
                downs.push(downloadSong());
            }

            yield Promise.all(downs);

            yield fsco.writeFile('local_songs.json', JSON.stringify(that.local_songs));

            utils.logtips("Download complete!!");
        });
    }
};

const argv = require('minimist')(process.argv.slice(2))
if (!argv.u || !argv.p) {
    console.error("-u <username> -p <password>");
    process.exit(1);
}

var sl = new DoubanFMSongList();
/*
//sl.logout();
//process.exit(1);
sl.login({name:argv.u, password:argv.p});
sl.getSongIDs();
sl.getAllSongInfo().then(() => {
    sl.downloadAllSongs();
    sl.logout();
});
*/

fsco.readFile('redheart1.txt').then((data) => {
    data = data.toString();
    let lines = data.split('\n');
    sl.songs_meta = {}
    sl.songs_meta[Symbol.iterator] = function* () {
        for (let i in this)
            yield this[i];
    }.bind(sl.songs_meta);
    let sid = 0;
    for (let l of lines) {
        const sp1 = l.indexOf('>');
        const sp2 = l.indexOf(']');
        const sp3 = l.indexOf('}');
        if (sp1 < 0)
            continue;
        let s = {
            title: l.slice(1, sp1),
            url: l.slice(sp1+2, sp2),
            sha256: l.slice(sp2+2, sp3)
        };
        //console.log("SS", s);
        sl.songs_meta[sid] = s;
        ++sid;
    }


    sl.downloadAllSongs();
});
