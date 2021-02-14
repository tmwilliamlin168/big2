import Client from './Client';
import server from './server';

export default class Room {
	name: string;
	password: string;
	clients: Client[] = [];
	running: boolean = false;
	constructor(name: string, password: string) {
		this.name = name;
		this.password = password;
	}
	add(client: Client) {
		this.clients.push(client);
		client.room = this;
		client.socket.join(this.name);
		server.to(this.name).emit('roomUpdate', {users: this.clients.map((client: Client) => client.username)});
	}
};
