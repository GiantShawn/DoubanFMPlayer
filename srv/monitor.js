'use strict';
import getmoment, * as moment from 'moment';
import * as net from 'net';
import * as http from 'http';
import * as lo from 'lodash';
import * as utils from './utils';

export default class Monitor
{
    constructor(app, logtar, addrinfo)
    {
        this.app = app;

        // log
        this.logtar = logtar;
        this.csl = new console.Console(this.logtar);

        // netadmin
        this.host = addrinfo[0];
        this.port = addrinfo[1];

        this.monitor = net.createServer(this.onNewConnection.bind(this));

    }

    start()
    {
        this.monitor.listen(this.port, this.host, () => {
            utils.loginfo("Monitor Start at port %s:%d", this.host, this.port);
        });
    }

    onNewConnection(c)
    {
        const conn = Object.create(c, {
            batchinput: { writable: true, value: false },
            batchinputends: {writable: true, value: ''},
            batchinputidx: {writable: true, value: 0},
        });

        //c.setEncoding('utf-8');
        c.setEncoding('ascii');

        let chunks = [];
        function prompt(ind = 0, no_enter = false)
        {
            if (no_enter) {
                c.write(utils.color_fmt.tips('>'.repeat(ind+1) + ' '));
            } else {
                c.write(utils.color_fmt.tips('\n>'.repeat(ind+1) + ' '));
            }
        }
        const neprompt = (ind = 0) => prompt(ind, true);

        neprompt();
        c.on('data', (data) => {
            if (conn.batchinput) {
                for (let i in data) {
                    if (conn.batchinputends[conn.batchinputidx] !== data[i]) {
                        conn.batchinputidx = 0;
                        continue;
                    }
                    ++conn.batchinputidx;
                    if (conn.batchinputidx === conn.batchinputends.length) {
                        const cmd_data = (chunks.join('') + data.substr(0, +i+1));
                        const cmd = [conn.batchinputends, cmd_data.slice(0, -conn.batchinputends.length).trim()];
                        this.app.handleMonitorCommand(cmd, lo.partial(this.netadminHandleCB.bind(conn), prompt));
                        conn.batchinput = false;

                        chunks = [];
                        data = data.slice(+i+1).trimLeft();
                        break;
                    }
                }
            }


            chunks.push(data);
            if (!conn.batchinput && data.indexOf("\n") >= 0) {
                const next_start = data.indexOf("\n");
                let cmdchunks = chunks.slice(0, -1);
                cmdchunks.push(data.substring(0, next_start));
                chunks = [data.substr(next_start)]

                const cmd = cmdchunks.join('').trim().split(/[ \t]+/);
                if (!cmd[0]) {
                    // enter
                    neprompt();
                } else {
                    this.app.handleMonitorCommand(cmd, lo.partial(this.netadminHandleCB.bind(conn), prompt));
                }
            }
        });
        
        c.on('error', (err) => {
            utils.loginfo("NetAdmin Conn ended with reason:%s", err);
            chunks = [];
        });

        c.on('end', () => {
            if (conn.batchinput) {
                const cmd = [conn.batchinputends, chunks.join('')];
                this.app.handleMonitorCommand(cmd, lo.partial(this.netadminHandleCB.bind(conn), prompt));
            } else {
                const cmd = chunks.join('').trim().split(/[ \t]+/);
                if (cmd[0]) {
                    // may not be able to send back result cos TCP is duplex and r/w should be closed at the same time
                    this.app.handleMonitorCommand(cmd, lo.partial(this.netadminHandleCB.bind(conn), prompt));
                }
            }
        });
    }

    netadminHandleCB(prompt, msg, type = 0, is_end = true)
    {
        /* this === a client connection */
        let conn = this;

        if (msg.startsWith('**CONTINUE**')) {
            conn.batchinput = true;
            conn.batchinputends = msg.substr(12);
            conn.batchinputidx = 0;
            return;
        }

        if (type === 0)
            conn.write(msg);
        else
            conn.write(utils.color_fmt.error(msg));

        if (is_end)
            prompt();
    }

    loginfo(tag, fmt, ...args)
    {
        this.csl.log('%s [INFO] <%s> ' + fmt, getmoment().format('DD dd MMM YYYY'),
            tag, ...args);
    }

    logtips(tag, fmt, ...args)
    {
        this.csl.error('%s [TIPS] <%s> ' + fmt, getmoment().format('DD dd MMM YYYY'),
            tag, ...args);
    }

    logerror(tag, fmt, ...args)
    {
        this.csl.error('%s [ERROR] <%s> ' + fmt, getmoment().format('DD dd MMM YYYY'),
            tag, ...args);
    }

};


