import {Socket} from 'socket.io';

export default (socket: Socket, s: string) => {
	console.log(`[${socket.id}, ${socket.handshake.address}] ${s}`);
};
