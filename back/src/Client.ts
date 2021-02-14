import {Socket} from 'socket.io';

export default class Client {
	id: number;
	username: string;
	socket: Socket;
	disconnectTimeout: NodeJS.Timeout | null = null;
	room: string | null = null;
	constructor(id: number, username: string, socket: Socket) {
		this.id = id;
		this.username = username;
		this.socket = socket;
	}
}
