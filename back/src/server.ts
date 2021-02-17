import fs from 'fs';
import http from 'http';
import https from 'https';
import {Server} from 'socket.io';

const base = process.env.SSL_KEY && process.env.SSL_CERT && process.env.SSL_CA ? https.createServer({
	"key": fs.readFileSync(process.env.SSL_KEY),
  "cert": fs.readFileSync(process.env.SSL_CERT),
  "ca": fs.readFileSync(process.env.SSL_CA)
}) : http.createServer();
base.listen(+process.env.PORT!, () => {
	console.log(`Listening on port ${process.env.PORT}`);
});

export default new Server(base, {cors: {origin: process.env.ORIGIN, methods: ['GET', 'POST']}});
