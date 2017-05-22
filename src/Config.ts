import * as fs from 'fs';

export class Config{
    ClientConfig: any = JSON.parse(fs.readFileSync('./src/ClientConfig.json', 'utf8'));
}
