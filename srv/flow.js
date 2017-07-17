'use strict';

import * as stream from 'stream';

class SongRStream extends stream.Readable
{
    constructor(options)
    {
        super(options);
    }
};

class SongWStream extends stream.Writable
{
    constructor(options)
    {
        super(options);
    }
};

class SongURIWStream extends stream.Writable
{
    constructor(options)
    {
        super(options);
    }
};

class SongURIRStream extends stream.Readable
{
    constructor(options)
    {
        super(options);
    }
};

