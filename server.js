const http = require('http');
const fs = require('fs');

const hostname = '0.0.0.0';
const port = 3000;

const messages = [];
const users = [];
const requests = [];

const website = fs.readFileSync(__dirname + '/index.html').toString();

const server = http.createServer((request, response) => {
    const url = request.url.split('?');
    if (request.method == 'GET' && (url == '/' || url == 'index')) {
        response.writeHead(200, {
            'Content-Type': 'text/html'
        });

        const website = fs.readFileSync(__dirname + '/index.html').toString();
        response.write(website);
        response.end();
        return;
    }

    if (request.method == 'GET' && url[0] == '/messages') {
        response.writeHead(200, {
            "Content-Type": "application/json"
        });

        let answer = messages;

        if (url[1] && url[1].split('=')[0] == 'after') {
            const after = Number(url[1].split('=')[1]);
            answer = answer.filter(m => m.time > after) || [];
        }

        if (url[1] && url[1].split('=')[0] == 'from') {
            const from = Number(url[1].split('=')[1]);
            answer = answer.filter(m => m.time = from) || [];
        }

        for (let m of answer) {
            const name = users.filter(u => u.id == m.user)[0];
            if (name) {
                m.user = name.name;
            }
        }


        response.end(JSON.stringify(answer));
        return;
    }

    if (request.method == 'GET' && url[0] == '/users') {
        response.writeHead(200, {
            "Content-Type": "application/json"
        });

        let answer = users.map(u => {
            delete u.cookie;
            return u;
        });

        if (url[1] && url[1].split('=')[0] == 'id') {
            const who = Number(url[1].split('=')[1]);
            answer = answer.filter(m => m.id == who)[0] || {};
        }

        response.end(JSON.stringify(answer));
        return;
    }

    if (request.method == 'POST' && url == '/send') {
        let body = [];
        request.on('data', (chunk) => {
            body.push(chunk);
        }).on('end', () => {
            body = Buffer.concat(body).toString();

            let parts = body.split('&');
            parts = parts.map((n) => n.split('='));
            parts = parts.filter((n) => n.length == 2);
            parts = parts.map((p) => p.map((n) => n.split('+').join(' ')));


            const msg = {};
            for (let p of parts) {
                msg[p[0]] = decodeURIComponent(p[1]);
            }

            const user = users.filter(u => u.cookie == msg.cookie)[0];
            if (user) {
                const newMsg = {
                    user: user.id,
                    message: msg.message,
                    time: Date.now()
                };
                messages.push(newMsg);
                response.statusCode = 201;
                response.setHeader('Content-Type', 'application/json');
                response.setHeader('Location', '/messages?from=' + newMsg.time);
                response.end(JSON.stringify(newMsg));

                const now = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
                console.log(now + '\t' + user.name + ' says: ' + msg.message);

                return;
            }
            response.statusCode = 400;
            response.setHeader('Content-Type', 'text/plain');
            response.end('Message not sent.');
        });

        return;
    }

    if (request.method == 'POST' && url == '/signup') {
        let body = [];
        request.on('data', (chunk) => {
            body.push(chunk);
        }).on('end', () => {
            body = Buffer.concat(body).toString();

            let parts = body.split('&');
            parts = parts.map((n) => n.split('='));
            parts = parts.filter((n) => n.length == 2);
            parts = parts.map((p) => p.map((n) => n.split('+').join(' ')));

            const msg = {};
            for (let p of parts) {
                msg[p[0]] = decodeURIComponent(p[1]);
            }

            const name = msg.name;
            if (name) {
                const newUser = {
                    id: users.length,
                    name: name,
                    cookie: generateCookie()
                };
                users.push(newUser);
                response.statusCode = 201;
                response.setHeader('Content-Type', 'application/json');
                response.setHeader('Location', '/users?id=' + newUser.id);
                response.end(JSON.stringify(newUser));

                const now = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
                console.log(now + '\tNew user created: ' + newUser.name);
                return;
            }
            response.statusCode = 400;
            response.setHeader('Content-Type', 'text/plain');
            response.end('User not created.');
        });

        return;
    }

    response.statusCode = 404;
    response.end('Not found');
});

server.listen(port, hostname, () => {
    console.log('Server is go');
});

const generateCookie = () => {
    return Math.floor(Date.now() * Math.random() * 1000).toString(36).substr(2, 8);
}