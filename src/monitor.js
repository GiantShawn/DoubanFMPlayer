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

    createTerm()
    {
        // Create a screen object.
        var screen = blessed.screen({
          smartCSR: true
        });

        screen.title = 'my window title';

        // Create a box perfectly centered horizontally and vertically.
        var box = blessed.box({
          top: 'center',
          left: 'center',
          width: '50%',
          height: '50%',
          content: 'Hello {bold}world{/bold}!',
          tags: true,
          border: {
            type: 'line'
          },
          style: {
            fg: 'white',
            bg: 'magenta',
            border: {
              fg: '#f0f0f0'
            },
            hover: {
              bg: 'green'
            }
          }
        });

        // Append our box to the screen.
        screen.append(box);

        // Add a png icon to the box
        var icon = blessed.image({
          parent: box,
          top: 0,
          left: 0,
          type: 'overlay',
          width: 'shrink',
          height: 'shrink',
          file: __dirname + '/my-program-icon.png',
          search: false
        });

        // If our box is clicked, change the content.
        box.on('click', function(data) {
          box.setContent('{center}Some different {red-fg}content{/red-fg}.{/center}');
          screen.render();
        });

        // If box is focused, handle `enter`/`return` and give us some more content.
        box.key('enter', function(ch, key) {
          box.setContent('{right}Even different {black-fg}content{/black-fg}.{/right}\n');
          box.setLine(1, 'bar');
          box.insertLine(1, 'foo');
          screen.render();
        });

        // Quit on Escape, q, or Control-C.
        screen.key(['escape', 'q', 'C-c'], function(ch, key) {
          return process.exit(0);
        });

        // Focus our element.
        box.focus();

        // Render the screen.
        screen.render();
    }
};


