import {Socket} from 'socket.io';

import Room from './Room';

export const clients = new Map();
export const usernameToId = new Map();

let newClientId = 0;

export default class Client {
	id: number;
	username: string;
	socket: Socket;
	disconnectTimeout: NodeJS.Timeout | null = null;
	room: Room | null = null;
	constructor(username: string, socket: Socket) {
		this.id = newClientId++;
		this.username = username;
		this.socket = socket;
	}
}
