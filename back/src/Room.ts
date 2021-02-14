import Client from './Client';
import Game from './Game';
import logSocket from './logSocket';
import server from './server';

export default class Room {
	static rooms = new Map();
	static get(name: string) {
		return this.rooms.get(name);
	}
	name: string;
	password: string;
	clients: Client[] = [];
	host: Client;
	game: Game | null = null;
	constructor(name: string, password: string, host: Client) {
		this.name = name;
		this.password = password;
		this.host = host;
		this.add(host);
		Room.rooms.set(name, this);
		host.socket.once('startGame', () => this.startGame());
	}
	add(client: Client) {
		this.clients.push(client);
		client.room = this;
		this.addSocket(client);
	}
	addSocket(client: Client) {
		client.socket.join(this.name);
		client.socket.emit('joinRoom', {name: this.name});
		client.socket.once('leaveRoom', () => this.remove(client));
		server.to(this.name).emit('roomUpdate', {
			users: this.clients.map((client: Client) => client.username),
			host: this.host.username
		});
	}
	remove(client: Client) {
		this.clients.splice(this.clients.indexOf(client), 1);
		client.room = null;
		client.socket.leave(this.name);
		client.socket.emit('leaveRoom');
		if (!this.clients.length) {
			Room.rooms.delete(this.name);
			return;
		}
		if (this.host === client) {
			this.host.socket.removeAllListeners('startGame');
			this.host = this.clients[0];
			if (!this.game)
				this.host.socket.once('startGame', () => this.startGame());
		}
		server.to(this.name).emit('roomUpdate', {
			users: this.clients.map((client: Client) => client.username),
			host: this.host.username
		});
	}
	startGame() {
		if (this.clients.length < 3) {
			this.host.socket.disconnect();
			logSocket(this.host.socket, 'Not enough users for startGame');
			return;
		}
		this.game = new Game();
		console.log('game started '+this.name);
	}
};
