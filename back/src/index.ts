import dotenv from 'dotenv';
import {Server, Socket} from 'socket.io';

dotenv.config();

import Client from './Client';
import Room from './Room';

const logSocket = (socket: Socket, s: string) => {
	console.log(`[${socket.id}, ${socket.handshake.address}] ${s}`);
};

const server = new Server({cors: {origin: process.env.ORIGIN, methods: ['GET', 'POST']}});

let newClientId = 0;
const clients = new Map();
const usernameToId = new Map();

const rooms = new Map();

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
		// Character filter
		if (!username.match(/^[0-9a-zA-Z]+$/)) {
			socket.emit('loginRes', {success: false, error: 'Username can only consist of alphanumeric characters'});
			return;
		}
		if (usernameToId.has(username)) {
			const client2 = clients.get(usernameToId.get(username)) as Client;
			if(client2.socket.connected || client2.socket.handshake.address !== socket.handshake.address) {
				socket.emit('loginRes', {success: false, error: 'Username taken'});
				logSocket(socket, 'Username taken');
				return;
			}
			client = client2;
			clearTimeout(client.disconnectTimeout!);
			client.socket = socket;
			socket.emit('loginRes', {success: true});
			logSocket(socket, 'Reconnect login successful');
		} else {
			client = new Client(newClientId++, username, socket);
			clients.set(client.id, client);
			usernameToId.set(username, client.id);
			socket.emit('loginRes', {success: true});
			logSocket(socket, 'Login successful');
		}

		socket.on('joinRoom', (name, password) => {
			client = client as Client;
			// Bad name argument
			if (typeof name !== 'string' || name.length < 1 || name.length > 15) {
				socket.disconnect();
				logSocket(socket, 'Bad name argument on joinRoom');
				return;
			}
			// Bad password argument
			if (typeof password !== 'string' || password.length > 15) {
				socket.disconnect();
				logSocket(socket, 'Bad password argument on joinRoom');
				return;
			}
			// Character filter
			if (!name.match(/^[0-9a-zA-Z ]+$/)) {
				socket.emit('joinRoomRes', {success: false, error: 'Room name can only consist of alphanumeric characters and spaces'});
				return;
			}
			// Make sure not in room
			if (client.room) {
				socket.disconnect();
				logSocket(socket, 'Already in room on joinRoom');
				return;
			}
			// Make sure room exists
			if (!rooms.has(name)) {
				socket.emit('joinRoomRes', {success: false, error: `Room "${name}" does not exist`});
				return;
			}
			const room = rooms.get(name);
			// Make sure password is correct
			if (password !== room.password) {
				socket.emit('joinRoomRes', {success: false, error: 'Password is incorrect'});
				return;
			}
			// Make sure game has not yet started
			if (room.running) {
				socket.emit('joinRoomRes', {success: false, error: 'The game has already started'});
				return;
			}
			// Make sure room has space
			if (room.clients.length > 3) {
				socket.emit('joinRoomRes', {success: false, error: 'Room does not have enough space'});
				return;
			}
			// Success
			socket.emit('joinRoomRes', {success: true});
			room.add(client);
		});

		socket.on('createRoom', (name, password) => {
			client = client as Client;
			// Bad name argument
			if (typeof name !== 'string' || name.length < 1 || name.length > 15) {
				socket.disconnect();
				logSocket(socket, 'Bad name argument on createRoom');
				return;
			}
			// Bad password argument
			if (typeof password !== 'string' || password.length > 15) {
				socket.disconnect();
				logSocket(socket, 'Bad password argument on createRoom');
				return;
			}
			// Character filter
			if (!name.match(/^[0-9a-zA-Z ]+$/)) {
				socket.emit('createRoomRes', {success: false, error: 'Room name can only consist of alphanumeric characters and spaces'});
				return;
			}
			// Make sure not in room
			if (client.room) {
				socket.disconnect();
				logSocket(socket, 'Already in room on createRoom');
				return;
			}
			// Make sure room does not exist
			if (rooms.has(name)) {
				socket.emit('createRoomRes', {success: false, error: `Room "${name}" already exists`});
				return;
			}
			// Success
			socket.emit('createRoomRes', {success: true});
			const room = new Room(name, password);
			rooms.set(name, room);
			room.add(client);
		});
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
