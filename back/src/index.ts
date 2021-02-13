import dotenv from 'dotenv';
import {Server, Socket} from 'socket.io';

dotenv.config();

import Client from './Client';

const logSocket = (socket: Socket, s: string) => {
	console.log(`[${socket.id}, ${socket.handshake.address}] ${s}`);
};

const server = new Server({cors: {origin: process.env.ORIGIN, methods: ['GET', 'POST']}});

let newClientId = 0;
const clients = new Map();
const usernameToId = new Map();

server.on('connection', (socket: Socket) => {
	logSocket(socket, 'Connect');
	let client: Client | null = null;
	socket.on('login', username => {
		logSocket(socket, `Login as ${username}`);
		// Shouldn't login again???
		if (client) {
			socket.disconnect();
			logSocket(socket, 'Already logged in');
			return;
		}
		// Bad username argument
		if (typeof username !== 'string' || username.length < 1 || username.length > 15) {
			socket.disconnect();
			logSocket(socket, 'Bad username argument on login');
			return;
		}
		if (!username.match(/^[0-9a-zA-Z]+$/)) {
			socket.emit('loginRes', {success: false, error: 'Username can only consist of alphanumeric characters'});
			logSocket(socket, 'Username contained weird characters');
			return;
		}
		if (usernameToId.has(username)) {
			const client2 = clients.get(usernameToId.get(username));
			if(client2.socket.connected || client2.socket.handshake.address !== socket.handshake.address) {
				socket.emit('loginRes', {success: false, error: 'Username taken'});
				logSocket(socket, 'Username taken');
				return;
			}
			client = client2;
			clearTimeout(client!.disconnectTimeout!);
			client!.socket = socket;
			socket.emit('loginRes', {success: true});
			logSocket(socket, 'Reconnect login successful');
			return;
		}
		client = new Client(newClientId++, username, socket);
		clients.set(client.id, client);
		usernameToId.set(username, client.id);
		socket.emit('loginRes', {success: true});
		logSocket(socket, 'Login successful');
	});
	socket.on('disconnect', () => {
		logSocket(socket, 'Disconnect');
		if (!client) return;
		client.disconnectTimeout = setTimeout(() => {
			logSocket(socket, 'Full disconnect');
			clients.delete(client!.id);
			usernameToId.delete(client!.username);
		}, 60000);
	});
});

server.listen(+process.env.PORT! || 6900);
