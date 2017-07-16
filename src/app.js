'use strict';

import * as fs from 'fs';
import * as util from 'util';
import * as lo from 'lodash';
import Monitor from './monitor';
import * as utils from './utils';

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

    _netadmin_echo(args, netadmin)
    {
        if (args.length === 0) {
            console.log("CONTINUE ECHO");
            netadmin('**CONTINUE**endecho');
        } else
            netadmin(args.join(' '));
    }

    _netadmin_endecho(args, netadmin)
    {
        this._netadmin_echo(args, netadmin);
    }

    _netadmin_config(args, netadmin)
    {
        const c = lo.defaults({
            password: 'x',
        }, this.config);
        netadmin(util.inspect(c));
    }
    
    _netadmin_reload(args, netadmin)
    {
    }

    _netadmin_eval(args, netadmin)
    {
        if (!this.config.is_su) {
            netadmin("Only super user can do eval", 1);
            return;
        }

        if (args.length) {
            const expr = args.join(' ');
            this._doNetAdminEval(expr, netadmin);
        } else {
            //netadmin("NOT IMPLE");
            console.log("CONTINUE EVAL");
            netadmin('**CONTINUE**endeval'); // continue
        }

    }

    _netadmin_endeval(args, netadmin)
    {
        this._netadmin_eval(args, netadmin);
    }

    _doNetAdminEval(expr, netadmin)
    {
        process.nextTick(() => {
            global.echo = (msg) => netadmin(msg.toString()+'\n', 0, false);
            const end = ((rr) => () => rr('<--- Exit normally --->'))(netadmin);
            const endError = ((rr) => (res) => rr(res.toString(), 1))(netadmin);

            const vm = require('vm');
            try {
                //end(eval(expr)); // this may produce duplicate prompt, but never mind
                vm.runInThisContext(expr);
                end();
            } catch(e) {
                endError("Exception Thrown: " + e);
            } finally {
                global.echo = undefined;
            }
        });
    }

    _netadmin_su(args, netadmin)
    {
        if (this.config.is_su) {
            netadmin("You are already a super user", 1);
            return;
        }

        if (args.length !== 1 || args[0] !== '888') {
            netadmin("Authentication Fail", 1);
            return;
        }

        this.config.is_su = true;
        netadmin("Authentication Succeed!");
    }

};

const app = new Application()
app.start();

