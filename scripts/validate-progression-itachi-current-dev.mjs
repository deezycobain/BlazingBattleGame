import {pathToFileURL} from 'node:url';
import path from 'node:path';

const validator=path.join(process.cwd(),'scripts','validate-progression.mjs');
await import(`${pathToFileURL(validator).href}?v=${Date.now()}`);
