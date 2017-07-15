'use strict';

import * as fs from 'fs';
import * as lo from 'lodash';
import Monitor from './monitor';
import * as utils from './utils';

class Application
{
    constructor()
    {
        const argv = require('minimist')(process.argv.slice(2))
        if (!argv.u || !argv.p) {
            console.error("-username <username> -passwd <password>");
            process.exit(1);
        }

        this.config = {
            username: argv.username,
            password: argv.passwd,
            netadmin: utils.parseAddrSpec(argv.netadmin, '127.0.0.1', '8764'),
            frontend: utils.parseAddrSpec(argv.frontend, '0.0.0.0', '9865'),
            
            logtarget: argv.logfile && fs.createWriteStream(argv.logfile) || process.stdout,
        };

        this.monitor = new Monitor(this,
            this.config.logtarget,
            this.config.netadmin);

        this._setupLogFuncs();
    }

    handleMonitorCommand(cmd, retresult)
    {
        const func_name = '_netadmin_' + cmd[0];
        if (this[func_name] && typeof this[func_name] === 'function') {
            this[func_name](cmd.slice(1), retresult);
        } else {
            this.logerror("No NetAdmin command[%s] found. Full:%s", cmd[0].toString(), cmd.join(' '));
            retresult(`Command[${cmd[0]}] not found`, 1);
        }
    }

    _setupLogFuncs()
    {
        for (let n of ['info', 'tips', 'error']) {
            const fn = 'log' + n;
            this[fn] = lo.partial(this.monitor[fn].bind(this.monitor), 'app');
        }
    }

    _netadmin_echo(args, retresult)
    {
        retresult(args.join(' '), 0, false);
        retresult(args.join(' '), 1);
    }
};

const app = new Application();

/*
var blessed = require('blessed');

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

*/
