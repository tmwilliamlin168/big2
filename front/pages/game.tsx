import {useEffect, useState} from 'react';
import io, {Socket} from 'socket.io-client';

const LoginForm = ({finish, socket, username}: {finish: (s: string) => void, socket: Socket, username: string | null}) => {
	const [value, setValue] = useState(username || '');
	const [waiting, setWaiting] = useState(false);
	const [error, setError] = useState('');

	const login = () => {
		setWaiting(true);
		socket.emit('login', value);
		socket.once('loginRes', data => {
			setWaiting(false);
			if(data.success)
				finish(value);
			else
				setError(data.error);
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
	const [socket, setSocket] = useState(null);
	const [connected, setConnected] = useState(false);
	const [loggedIn, setLoggedIn] = useState(false);
	const [username, setUsername] = useState(null);

	useEffect(() => {
		const socket = io(process.env.NEXT_PUBLIC_BACK_HOST!);
		setSocket(socket);
		socket.on('connect', () => setConnected(true));
		socket.on('disconnect', () => {
			setConnected(false);
			setLoggedIn(false);
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
	return connected?'Connected':'Connecting';
}
