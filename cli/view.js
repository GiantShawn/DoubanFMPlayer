'use strict';

import * as blessed from 'blessed';


export default class View
{
    constructor()
    {
    }

    start()
    {
        this.createTerm();
    }

    createTerm()
    {
        // Create a screen object.
        var screen = blessed.screen({
            smartCSR: true
        });

        screen.title = 'DoubanFM';

        // Create a box perfectly centered horizontally and vertically.
        var box = blessed.list({
            top: 'center',
            left: 'center',
            width: '80%',
            height: '80%',
            //content: 'Hello {bold}world{/bold}!',
            items: ['line 1', 'line2', 'line 3', 'line 4xxx'],
            mouse: true,
            keys: true,
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
            file: __dirname + '../sun.jpg',
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
