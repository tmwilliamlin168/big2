import dotenv from 'dotenv';
import {Socket} from 'socket.io';

dotenv.config();

import Client, {clients, usernameToId} from './Client';
import logSocket from './logSocket';
import Room from './Room';
import server from './server';

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
			// client.socket = socket;
			client.updateSocket(socket);
			socket.emit('loginRes', {success: true});
			// if (client.room)
				// client.room.updateSocket(client);
			logSocket(socket, 'Reconnect login successful');
		} else {
			client = new Client(username, socket);
			clients.set(client.id, client);
			usernameToId.set(username, client.id);
			socket.emit('loginRes', {success: true});
			logSocket(socket, 'Login successful');

			client.on('joinRoom', (name, password) => {
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
				if (!Room.get(name)) {
					socket.emit('joinRoomRes', {success: false, error: `Room "${name}" does not exist`});
					return;
				}
				const room = Room.get(name);
				// Make sure password is correct
				if (password !== room.password) {
					socket.emit('joinRoomRes', {success: false, error: 'Password is incorrect'});
					return;
				}
				// Make sure game has not yet started
				if (room.game) {
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

			client.on('createRoom', (name, password) => {
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
				if (Room.get(name)) {
					socket.emit('createRoomRes', {success: false, error: `Room "${name}" already exists`});
					return;
				}
				// Success
				socket.emit('createRoomRes', {success: true});
				new Room(name, password, client);
			});
		}
	});

	socket.on('disconnect', () => {
		logSocket(socket, 'Disconnect');
		if (!client) return;
		client.disconnectTimeout = setTimeout(() => {
			client = client as Client;
			if (client.room) client.room.remove(client);
			logSocket(socket, 'Full disconnect');
			clients.delete(client.id);
			usernameToId.delete(client.username);
		}, 60000);
	});
});

server.listen(+process.env.PORT!);
