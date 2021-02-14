import {useEffect, useState} from 'react';
import io from 'socket.io-client';

import CreateRoomForm from '../components/CreateRoomForm';
import JoinRoomForm from '../components/JoinRoomForm';

const LoginForm = ({finish, socket, username}: {finish: (s: string) => void, socket: SocketIOClient.Socket, username: string | null}) => {
	const [value, setValue] = useState(username || '');
	const [waiting, setWaiting] = useState(false);
	const [error, setError] = useState('');

	const login = () => {
		setWaiting(true);
		socket.emit('login', value);
		socket.once('loginRes', (data: {success: boolean; error?: string}) => {
			setWaiting(false);
			if (data.success)
				finish(value);
			else
				setError(data.error!);
		});
	};

	useEffect(() => {
		if (username) login();
	}, []);

	return (
		<>
			<input
				type="text"
				maxLength={15}
				placeholder="Your username..."
				value={value}
				onChange={(e) => setValue(e.target.value)}
				disabled={waiting}
			/>
			<button onClick={login} disabled={!value || waiting}>
				Ok
			</button>
			{waiting && 'Logging in...'}
			<p style={{color: 'red'}}>{error}</p>
		</>
	);
};

export default function Game() {
	const [socket, setSocket] = useState<SocketIOClient.Socket | null>(null);
	const [connected, setConnected] = useState(false);
	const [loggedIn, setLoggedIn] = useState(false);
	const [username, setUsername] = useState<string | null>(null);

	const [room, setRoom] = useState<string | null>(null);
	const [roomUsers, setRoomUsers] = useState<string[]>([]);
	const [roomHost, setRoomHost] = useState('');

	useEffect(() => {
		const socket = io(process.env.NEXT_PUBLIC_BACK_HOST!);
		setSocket(socket);
		socket.on('connect', () => setConnected(true));
		socket.on('disconnect', () => {
			setConnected(false);
			setLoggedIn(false);
			setRoom(null);
		});
		socket.on('joinRoom', (data: {name: string}) => setRoom(data.name));
		socket.on('roomUpdate', (data: {users: string[], host: string}) => {
			setRoomUsers(data.users);
			setRoomHost(data.host);
		});
		return () => {socket.close()};
	}, []);

	if (!socket) return null;
	if (!loggedIn) {
		return (
			<LoginForm
				socket={socket}
				finish={(s) => {
					setLoggedIn(true);
					setUsername(s);
				}}
				username={username}
			/>
		);
	}
	if (!room) {
		return (
			<>
				<p>Logged in as {username}</p>
				<hr />
				<JoinRoomForm socket={socket} />
				<hr />
				<CreateRoomForm socket={socket} />
			</>
		);
	}
	return (
		<>
			<p>Room {room}</p>
			<p>Users:</p>
			<ul>
				{roomUsers.map(user => <li>{user + (user === roomHost ? ' (Host)':'')}</li>)}
			</ul>
		</>
	);
}
