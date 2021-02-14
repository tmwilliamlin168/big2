import {Server} from 'socket.io';

export default new Server({cors: {origin: process.env.ORIGIN, methods: ['GET', 'POST']}});
