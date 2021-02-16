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
	onListeners = new Map();
	onceListeners = new Map();
	constructor(username: string, socket: Socket) {
		this.id = newClientId++;
		this.username = username;
		this.socket = socket;
	}
	on(e: string, f: (...args: any[]) => void) {
		if (!this.onListeners.has(e))
			this.onListeners.set(e, []);
		this.onListeners.get(e).push(f);
		this.socket.on(e, f);
	}
	once(e: string, f: (...args: any[]) => void) {
		if (!this.onceListeners.has(e))
			this.onceListeners.set(e, []);
		this.onceListeners.get(e).push(f);
		this.socket.once(e, (...args) => {
			this.onceListeners.get(e).splice(this.onceListeners.get(e).indexOf(f), 1);
			f(...args);
		});
	}
	removeAllListeners(e: string) {
		this.socket.removeAllListeners(e);
		this.onListeners.delete(e);
		this.onceListeners.delete(e);
	}
	updateSocket(socket: Socket) {
		this.socket = socket;
		// Add listeners
		this.onListeners.forEach((fs, e) => fs.forEach((f: (...args: any[]) => void) => socket.on(e, f)));
		this.onceListeners.forEach((fs, e) => fs.forEach((f: (...args: any[]) => void) => {
			socket.once(e, (...args) => {
				this.onceListeners.get(e).splice(this.onceListeners.get(e).indexOf(f), 1);
				f(...args);
			});
		}));
		if (this.room)
			this.room.updateSocket(this);
	}
}
