'use strict';

import * as readline from 'readline';
import * as lo from 'lodash';
import * as utils from '../lib/utils';
import * as net from 'net';

class ClientApp
{
    constructor()
    {
        const argv = require('minimist')(process.argv.slice(2))
        if (argv._.length <= 0 || argv._[0].indexOf(':') < 0) {
            console.error("cli ip:port", argv._, !argv._, argv._.indexOf(':'));
            process.exit(1);
        }

        const [addr, port] = utils.parseAddrSpec(argv._[0], '127.0.0.1', 8764);
        if (argv.n) {
            // netadmin mode
            var netadmin = [addr, port];
            var term = null;
        } else {
            var netadmin = null;
            var term = [addr, port];
        }


        this.config = {
            netadmin: netadmin,
            term: term,
        };

        this._setupConsoleOutput();

    }

    start()
    {
        if (this.config.netadmin)
            this._setupNetAdminREPL()

    }

    _setupNetAdminREPL()
    {
        console.log("netadmin", this.config.netadmin);
        const skt = net.createConnection(this.config.netadmin[1], this.config.netadmin[0], () => {
            console.log("NET connection established");

            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout,
                prompt: '> '
            });

            //rl.prompt();

            rl.on('line', (line) => {
                const cmd = line.trim().split(/[ \t]+/);
                const cmd_name = '_cmd_' + cmd[0];
                if (this[cmd_name] && typeof this[cmd_name] === 'function') {
                    this[cmd_name](rl, cmd.slice(1));
                    rl.prompt();
                } else {
                    //this.puterror("Command Error");
                    skt.write(cmd.join(' ')+'\n');
                }
            }).on('close', () => {
                console.log('Have a great day!');
                process.exit(0);
            });

            skt.on('data', function cdata (data) {
                if (data.indexOf('>')) {
                    const dend = data.indexOf('>');
                    console.log(data.slice(0, dend));
                    rl.prompt();
                    console.log(data.slice(dend+1));
                } else {
                    console.log(data);
                }
            });

        });
        skt.setEncoding('utf-8');
    }

    _cmd_echo(rl, args)
    {
        //this.putinfo(args.join(' '));
        process.stdout.write("DOSIFUD");
        //rl.write(args.join(' '));
    }

    _setupConsoleOutput()
    {
        for (let fn of ['info', 'error', 'tips']) {
            this['put'+fn] = utils['log'+fn];
        }
    }


};

const cli = new ClientApp()
cli.start();
