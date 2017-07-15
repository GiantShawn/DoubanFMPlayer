'use strict';
import getmoment, * as moment from 'moment';
import * as net from 'net';
import * as http from 'http';
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
        this.monitor.listen(this.port, this.host, () => {
            utils.loginfo("Monitor Start at port %s:%d", this.host, this.port);
        });

    }

    onNewConnection(c)
    {
        c.setEncoding('utf-8');

        let chunks = [];
        function prompt(ind = 0)
        {
            c.write(utils.color_fmt.tips('>'.repeat(ind+1) + ' '));
        }

        prompt();
        c.on('data', (data) => {
            chunks.push(data);
            if (data.indexOf("\n") >= 0) {
                const next_start = data.indexOf("\n");
                let cmdchunks = chunks.slice(0, -1);
                cmdchunks.push(data.substring(0, next_start));
                chunks = [data.substr(next_start)]

                const cmd = cmdchunks.join('').trim().split(/[ \t]+/);
                if (!cmd[0]) {
                    // enter
                    prompt();
                } else {
                    this.app.handleMonitorCommand(cmd, (result, tp = 0, is_end = true) => {
                        if (tp === 0)
                            c.write(result+"\n");
                        else
                            c.write(utils.color_fmt.error(result) + '\n');

                        if (is_end)
                            prompt();
                    });
                }
            }
        });
        
        c.on('error', (err) => {
            utils.loginfo("NetAdmin Conn ended with reason:%s", err);
            chunks = [];
        });

        c.on('end', () => {
            const cmd = chunks.join('').trim().split(/[ \t]+/);
            if (cmd[0]) {
                // may not be able to send back result cos TCP is duplex and r/w should be closed at the same time
                this.app.handleMonitorCommand(cmd, (result) => c.write(result+"\n"));
            }
        });
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


