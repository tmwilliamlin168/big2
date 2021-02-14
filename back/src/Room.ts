import Client from './Client';

export default class Room {
	name: string;
	password: string;
	clients: Client[] = [];
	running: boolean = false;
	constructor(name: string, password: string) {
		this.name = name;
		this.password = password;
	}
};
