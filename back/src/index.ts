import dotenv from 'dotenv';
import {Server, Socket} from 'socket.io';

dotenv.config();

const server = new Server({cors: {origin: process.env.ORIGIN, methods: ['GET', 'POST']}});

server.on('connection', (socket: Socket) => {
	console.log('client connect', socket.id);
	socket.on('login', username => {
		if (typeof username !== 'string' || username.length < 1 || username.length > 15) {
			socket.disconnect();
			return;
		}
		socket.emit('loginRes', {success: true});
	});
	socket.on('disconnect', () => console.log('disconnect'))
});

server.listen(+process.env.PORT! || 6900);
