const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const net = require('net');

class GFWList {
  gfwlist = '';

  regexp = {
    url: /^https?:\/\//i,
    domain: /^([a-z\-\d+]+\.){1,}[a-z\-\d]/i,
  };

  reslut = new Set();

  constructor(filepath) {
    this.gfwlist = Buffer.from(
      fs.readFileSync(filepath, 'utf-8'),
      'base64'
    ).toString('utf-8');
    fs.writeFileSync('gfwlist.txt', this.gfwlist);
  }

  reader(name) {
    const matchs = this.gfwlist.match(
      new RegExp(
        `!#{4,}${name} List Start#{4,}([\\s\\S]*)!#{4,}${name} List End#{4,}`,
        'i'
      )
    );
    if (!matchs) {
      throw new Error(`${name} List Not Found`);
    }
    return matchs[1]
      .split('\n')
      .filter(
        (item) =>
          !item.startsWith('!') &&
          !item.startsWith('@') &&
          !item.startsWith('[') &&
          item.trim() !== ''
      );
  }

  hanlderGeneral() {
    const general = this.reader('General');

    for (let index = 0; index < general.length; index++) {
      let item = general[index];
      let text = '';

      if (item.startsWith('||')) {
        item = item.substring(2);
      }
      if (item.startsWith('|')) {
        item = item.substring(1);
      }
      if (item.startsWith('.')) {
        item = item.substring(1);
      }

      item = decodeURIComponent(item);

      if (net.isIP(item)) {
        text = `SRC-IP,${item}`;
      } else if (this.regexp.domain.test(item) || this.regexp.url.test(item)) {
        let url;
        if (this.regexp.url.test(item)) {
          url = new URL(item);
        } else {
          url = new URL(`http://${item}`);
        }
        if (url.hostname.startsWith('www.')) {
          url.hostname = url.hostname.substring(4);
        }
        if (url.hostname.startsWith('*.')) {
          url.hostname = url.hostname.substring(2);
        }
        text = `DOMAIN-SUFFIX,${url.hostname}`;
      } else {
        console.log('[Unresolved]', item);
      }

      if (text) {
        this.reslut.add(text);
      }
    }
  }

  generate() {
    this.hanlderGeneral();

    fs.writeFileSync(
      path.resolve('gfwlist.list'),
      [...this.reslut].sort().join('\n'),
      'utf-8'
    );
  }
}

const gfwlist = new GFWList(path.resolve('gfwlist', 'gfwlist.txt'));

gfwlist.generate();
