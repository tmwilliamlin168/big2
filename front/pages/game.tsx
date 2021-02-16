import {useEffect, useState} from 'react';
import io from 'socket.io-client';

import CreateRoomForm from '../components/CreateRoomForm';
import JoinRoomForm from '../components/JoinRoomForm';
import LoginForm from '../components/LoginForm';

export default function Game() {
	const [socket, setSocket] = useState<SocketIOClient.Socket | null>(null);
	const [connected, setConnected] = useState(false);
	const [loggedIn, setLoggedIn] = useState(false);
	const [username, setUsername] = useState<string | null>(null);

	const [room, setRoom] = useState<string | null>(null);
	const [roomUsers, setRoomUsers] = useState<string[]>([]);
	const [roomHost, setRoomHost] = useState('');

	const [gameState, setGameState] = useState(null);
	const [cardSelected, setCardSelected] = useState([]);

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
		socket.on('leaveRoom', () => setRoom(null));
		socket.on('roomUpdate', (data: {users: string[], host: string}) => {
			setRoomUsers(data.users);
			setRoomHost(data.host);
		});

		socket.on('gameState', (data) => {
			setGameState(data);
			if (data.cards.length !== cardSelected.length)
				setCardSelected(new Array(data.cards.length).fill(false));
		});
		socket.on('endGame', () => setGameStatus(null));

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
	if (!gameState) {
		return (
			<>
				<p>Room {room}</p>
				<p>Users:</p>
				<ul>
					{roomUsers.map(user => <li key={user}>{user + (user === roomHost ? ' (Host)':'')}</li>)}
				</ul>
				<button onClick={() => socket.emit('leaveRoom')}>Leave</button>
				{username === roomHost &&
					<button
						onClick={() => socket.emit('startGame')}
						disabled={roomUsers.length < 3}
					>
						Start
					</button>
				}
			</>
		);
	}
	return (
		<>
			<div>
				<p>Your cards:</p>
				{gameState.cards.map((card, i) => (
					<label key={card}>
						<input
							type="checkbox"
							defaultChecked={cardSelected[i]}
							onChange={() => {
								const cardSelected2 = [...cardSelected];
								cardSelected2[i] = !cardSelected[i];
								setCardSelected(cardSelected2);
							}}
						/>
						{card.rank+' '+card.suit}
					</label>
				))}
			</div>
		</>
	);
}
