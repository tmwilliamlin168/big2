import {Server, Socket} from 'socket.io';

const server = new Server();

server.on('connection', (client: Socket) => {
	console.log(client);
	client.on('disconnect', () => console.log('disconnect'))
});

server.listen(+process.env.PORT! || 6900);
