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
		client.socket.join(this.name);
		server.to(this.name).emit('roomUpdate', {
			users: this.clients.map((client: Client) => client.username),
			host: this.host.username
		});
	}
};
