'use strict';

export class NACBasics
{
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

export class NACEval
{
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

};

