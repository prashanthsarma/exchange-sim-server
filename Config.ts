import * as fs from 'fs';

export class Config{
    ClientConfig: any = JSON.parse(fs.readFileSync('./ClientConfig.json', 'utf8'));
}
