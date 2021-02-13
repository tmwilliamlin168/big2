import dotenv from 'dotenv';
import {Server, Socket} from 'socket.io';

dotenv.config();

const server = new Server({cors: {origin: process.env.ORIGIN, methods: ['GET', 'POST']}});

server.on('connection', (client: Socket) => {
	console.log('client connect');
	client.on('disconnect', () => console.log('disconnect'))
});

server.listen(+process.env.PORT! || 6900);
