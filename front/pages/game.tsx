import {canPlay, Card} from 'big2-core';
import {useEffect, useState} from 'react';
import io from 'socket.io-client';

import CreateRoomForm from '../components/CreateRoomForm';
import JoinRoomForm from '../components/JoinRoomForm';
import LoginForm from '../components/LoginForm';

interface GameState {
	cards: Card[],
	players: {username: string, numCards: number, rank: number}[],
	lastPlayed: Card[] | null,
	lastPlayedPlayer: string | null,
	playerTurn: string
}

const rankStrs = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const suitChars = ['♣', '♦', '♥', '♠'];

export default function Game() {
	const [socket, setSocket] = useState<SocketIOClient.Socket | null>(null);
	const [connected, setConnected] = useState(false);
	const [loggedIn, setLoggedIn] = useState(false);
	const [username, setUsername] = useState<string | null>(null);

	const [room, setRoom] = useState<string | null>(null);
	const [roomUsers, setRoomUsers] = useState<string[]>([]);
	const [roomHost, setRoomHost] = useState('');

	const [gameState, setGameState] = useState<GameState | null>(null);
	const [cardSelected, setCardSelected] = useState<boolean[]>([]);

	useEffect(() => {
		const socket = io(process.env.NEXT_PUBLIC_BACK_HOST!);
		setSocket(socket);
		socket.on('connect', () => setConnected(true));
		socket.on('disconnect', () => {
			setConnected(false);
			setLoggedIn(false);
			setRoom(null);
			setGameState(null);
		});

		socket.on('joinRoom', (data: {name: string}) => setRoom(data.name));
		socket.on('leaveRoom', () => {
			setRoom(null);
			setGameState(null);
		});
		socket.on('roomUpdate', (data: {users: string[], host: string}) => {
			setRoomUsers(data.users);
			setRoomHost(data.host);
		});

		socket.on('gameState', (data: GameState) => {
			setGameState(data);
			if (data.cards.length !== cardSelected.length)
				setCardSelected(new Array(data.cards.length).fill(false));
		});
		socket.on('endGame', () => setGameState(null));

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
	const selectedCards = gameState.cards.filter((_, i) => cardSelected[i]);
	return (
		<>
			<ul>
				{gameState.players.map(p => (
					<li key={p.username}>
						{p.username + (p.rank ? ` (Rank ${p.rank})` : '') + (p.numCards ? ` (${p.numCards} cards)` : '')}
					</li>
				))}
			</ul>
			<div>
				<p>Last played:</p>
				{gameState.lastPlayed ? (
					<>
						{gameState.lastPlayed.map((card, i) => <span key={i}>{rankStrs[card.rank]+' '+suitChars[card.suit]+'|'}</span>)}
						{` by ${gameState.lastPlayedPlayer}`}
					</>
				) : '(Nothing)'}
			</div>
			{`It's ${gameState.playerTurn}'s turn!`}
			<div>
				<p>Your cards:</p>
				{gameState.cards.map((card, i) => (
					<label key={card.rank+' '+card.suit}>
						<input
							type="checkbox"
							checked={cardSelected[i] || false}
							onChange={() => {
								const cardSelected2 = [...cardSelected];
								cardSelected2[i] = !cardSelected[i];
								setCardSelected(cardSelected2);
							}}
						/>
						{rankStrs[card.rank]+' '+suitChars[card.suit]}
					</label>
				))}
				<button
					onClick={() => socket.emit('turn', selectedCards)}
					disabled={username !== gameState.playerTurn || !canPlay(gameState.lastPlayed, selectedCards)}
				>
					Play
				</button>
				<button
					onClick={() => socket.emit('turn', null)}
					disabled={username !== gameState.playerTurn}
				>
					Pass
				</button>
			</div>
		</>
	);
}
