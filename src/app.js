'use strict';

import * as fs from 'fs';
import * as util from 'util';
import * as lo from 'lodash';
import Monitor from './monitor';
import {NACBasics, NACEval} from './netadmin';
import * as utils from './utils';
import {mixinClasses} from './utils';

import * as blessed from 'blessed';

class Application
{
    constructor()
    {
        const argv = require('minimist')(process.argv.slice(2))
        if (!argv.username || !argv.passwd) {
            console.error("--username=<username> --passwd=<password>");
            process.exit(1);
        }

        this.config = {
            username: argv.username,
            password: argv.passwd,
            netadmin: utils.parseAddrSpec(argv.netadmin, '127.0.0.1', '8764'),
            frontend: utils.parseAddrSpec(argv.frontend, '0.0.0.0', '9865'),
            logtarget: argv.logfile && argv.logfile || 'stdout',
            is_su: false,
        };

        const logtarget = this.config.logtarget == 'stdout' && process.stdout || fs.createWriteStream(this.config.logtarget);
        this.monitor = new Monitor(this,
            logtarget,
            this.config.netadmin);

        this._setupLogFuncs();
    }

    start()
    {
        this.monitor.start();
    }

    handleMonitorCommand(cmd, netadmin)
    {
        const func_name = '_netadmin_' + cmd[0];
        if (this[func_name] && typeof this[func_name] === 'function') {
            try {
                this[func_name](cmd.slice(1), netadmin);
            } catch (e) {
                this.logerror("Internal Error in NetAdminCommand!: %s", e.toString());
                netadmin(`Internal Error in NetAdminCommand[${cmd.toString()}]`);
            }
        } else {
            this.logerror("No NetAdmin command[%s] found. Full:%s", cmd[0].toString(), cmd.join(' '));
            netadmin(`Command[${cmd[0]}] not found`, 1);
        }
    }

    _setupLogFuncs()
    {
        for (let n of ['info', 'tips', 'error']) {
            const fn = 'log' + n;
            this[fn] = lo.partial(this.monitor[fn].bind(this.monitor), 'app');
        }
    }
};


mixinClasses(Application, NACBasics, NACEval);

const app = new Application()
app.start();

