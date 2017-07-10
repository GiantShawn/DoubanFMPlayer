var qs = require("querystring");
var http = require("https");
var lo = require('lodash');



function DoubanFMSongList(cookies)
{
    this.cookies = cookies;
    this.q = [];
}

DoubanFMSongList.prototype = {
    constructor: DoubanFMSongList,
    getsonglist_options: {
        "method": "POST",
        "hostname": "douban.fm",
        "port": null,
        "path": "/j/v2/redheart/songs",
        "headers": {
            "accept": "text/javascript, text/html, application/xml, text/xml, */*",
            "origin": "https://douban.fm",
            "x-requested-with": "XMLHttpRequest",
            "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.115 Safari/537.36",
            "content-type": "application/x-www-form-urlencoded",
            "referer": "https://douban.fm/mine/hearts",
            "accept-encoding": "json",
            "accept-language": "en-US,en;q=0.8,zh-CN;q=0.6",
            'cookie': "flag=\"ok\"; bid=t4xPDCj1I1s; ac=\"1499573995\"; _ga=GA1.2.1260704849.1499574005; _gid=GA1.2.240229902.1499574005; dbcl2=\"73439176:FKMgD3xXUkI\"; ck=R3rG",
            "cache-control": "no-cache",
            "postman-token": "81083c84-e179-3825-fa69-3ae8e025ea9e"
        }
    },


    getsid_options: {
        "method": "GET",
        "hostname": "douban.fm",
        "port": null,
        "path": "/j/v2/redheart/basic",
        "headers": {
            'accept': "text/javascript, text/html, application/xml, text/xml, */*",
            'x-requested-with': "XMLHttpRequest",
            'user-agent': "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.115 Safari/537.36",
            'content-type': "application/x-www-form-urlencoded",
            'referer': "https://douban.fm/mine/hearts",
            'accept-encoding': "json",
            'accept-language': "en-US,en;q=0.8,zh-CN;q=0.6",
            'cookie': "flag=\"ok\"; bid=t4xPDCj1I1s; ac=\"1499573995\"; _ga=GA1.2.1260704849.1499574005; _gid=GA1.2.240229902.1499574005; dbcl2=\"73439176:FKMgD3xXUkI\"; ck=R3rG",
            'cache-control': "no-cache",
            'postman-token': "6640b627-f875-e835-c400-82b120e6d576"
        },
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

    handle_response(options, body, action)
    {
        const proc = (rsv, rej) => {
            const final_options = lo.cloneDeep(options);
            final_options.headers.cookie = this.cookies;
            //const final_options = lo.assign(options, {cookie: this.cookies});
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
                }); if (body && final_options.method.toLowerCase() === 'post') {
                if (typeof body === 'function')
                    body = body();
                req.write(body);
            }
            req.end();

        }
        this.enqueue(proc);
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

            //console.log("song+ids", this.song_ids);

        }

        this.handle_response(this.getsid_options, null, action);
    },

    getAllSongInfo(ck)
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
                ck: ck,
                kbps: '192',
                sids: this.song_ids.join('|')
            };

            return qs.stringify(post_body);
        }

        this.handle_response(this.getsonglist_options, get_post_body, action);
    },
};

var sl = new DoubanFMSongList('flag="ok"; bid=t4xPDCj1I1s; ac="1499573995"; _ga=GA1.2.1260704849.1499574005; _gid=GA1.2.240229902.1499574005; dbcl2="73439176:FKMgD3xXUkI"; ck=R3rG; flag="ok"; bid=t4xPDCj1I1s; ac="1499573995"; _ga=GA1.2.1260704849.1499574005; _gid=GA1.2.240229902.1499574005; _gat=1; dbcl2="73439176:zEEoH5TQtaY"; ck=Z6e0');
sl.getSongIDs();
sl.getAllSongInfo('Z6e0');
