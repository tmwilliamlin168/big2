import Client from './Client';
import server from './server';

export default class Room {
	name: string;
	password: string;
	clients: Client[] = [];
	host: Client;
	running: boolean = false;
	constructor(name: string, password: string, host: Client) {
		this.name = name;
		this.password = password;
		this.host = host;
		this.add(host);
	}
	add(client: Client) {
		this.clients.push(client);
		client.room = this;
		this.addSocket(client);
	}
	addSocket(client: Client) {
		client.socket.join(this.name);
		client.socket.emit('joinRoom', {name: this.name});
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
		if (!this.clients.length) return;
		if (this.host === client)
			this.host = this.clients[0];
		server.to(this.name).emit('roomUpdate', {
			users: this.clients.map((client: Client) => client.username),
			host: this.host.username
		});
	}
};
