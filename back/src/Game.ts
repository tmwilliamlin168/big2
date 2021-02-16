import {canPlay, Card, cmpCard, Suit} from 'big2-core';

import Client from './Client';
import logSocket from './logSocket';
import Room from './Room';
import server from './server';

class Player {
	game: Game;
	client: Client;
	cards: Card[] = [];
	disconnected = false;
	rank = 0;
	passed = false;
	constructor(game: Game, client: Client) {
		this.game = game;
		this.client = client;
	}
	sendGameStatus() {
		this.cards.sort(cmpCard);
		const i = this.game.players.indexOf(this);
		const otherPlayers = [];
		for (let j = 1; j < this.game.players.length; ++j)
			otherPlayers.push(this.game.players[(i + j) % this.game.players.length]);
		this.client.socket.emit('gameStatus', {
			cards: this.cards,
			rank: this.rank,
			passed: this.passed,
			players: otherPlayers.map((p: Player) => ({
				numCards: p.cards.length,
				rank: p.rank,
				passed: p.passed
			})),
			lastPlayed: this.game.lastPlayed,
			lastPlayedPlayer: this.game.lastPlayedPlayer,
			playerTurn: this.game.playerTurn
		});
	}
}

export default class Game {
	room: Room;
	players: Player[] = [];
	lastPlayed: Card[] | null = null;
	lastPlayedPlayer = -1;
	playerTurn = 0;
	playersFinished = 0;
	constructor(room: Room) {
		this.room = room;
		this.start();
	}
	async start() {
		const cards = [];
		for (let i = 1; i <= 13; ++i)
			for (let j = 1; j <= 4; ++j)
				cards.push(new Card(i, j));
		for (let i = 0; i < 52; ++i) {
			const j = Math.floor(Math.random() * (i+1));
			[cards[i], cards[j]] = [cards[j], cards[i]];
		}
		const handSize = Math.floor(52 / this.room.clients.length);
		for (let i = 0; i < this.room.clients.length; ++i) {
			this.players.push(new Player(this, this.room.clients[i]));
			this.players[i].cards = cards.slice(i * handSize, (i + 1) * handSize);
		}
		const startingPlayer = (this.players.find((p: Player) => p.cards.includes(new Card(3, Suit.Clubs))) || this.players[0]);
		if (this.room.clients.length === 3)
			 startingPlayer.cards.push(cards[51]);
		this.playerTurn = this.players.indexOf(startingPlayer);
		this.players.forEach((p: Player) => p.client.socket.emit('startGame'));
		while (true) {
			// Check if game ended
			const playersLeft: Player[] = [];
			this.players.forEach((p: Player) => {
				if (!p.rank && !p.disconnected)
					playersLeft.push(p);
			});
			if (playersLeft.length < 2) {
				if (playersLeft.length === 1)
					playersLeft[0].rank = ++this.playersFinished;
				break;
			}
			await this.round();
		}
		this.broadcastGameStatus();
		setTimeout(() => {
			server.to(this.room.name).emit('endGame');
			this.room.game = null;
		}, 5000);
	}
	broadcastGameStatus() {
		this.players.forEach((p: Player) => p.sendGameStatus());
	}
	async round() {

	}
	async turn() {
		const p = this.players[this.playerTurn];
		if (p.passed) return;
		this.broadcastGameStatus();
		await new Promise<void>(resolve => {
			const onLeaveRoom = () => {
				p.client.socket.removeAllListeners('turn');
				resolve();
			};
			p.client.socket.once('turn', cards => {
				p.client.socket.off('leaveRoom', onLeaveRoom);
				(() => {
					// Pass
					if (cards === null) {
						p.passed = true;
						return;
					}
					// Play
					if (cards && cards.isArray() && cards.every((card: Card) => card && card instanceof Card) && canPlay(this.lastPlayed, cards)) {
						this.lastPlayed = cards;
						this.lastPlayedPlayer = this.playerTurn;
						return;
					}
					p.client.socket.disconnect();
					logSocket(p.client.socket, 'Bad cards argument on turn');
				})();
				resolve();
			});
			p.client.socket.once('leaveRoom', onLeaveRoom);
		});
	}
	updateSocket(client: Client) {
		client.socket.emit('startGame');
		this.players.find((p: Player) => p.client === client)!.sendGameStatus();
	}
	remove(client: Client) {
		this.players.find((p: Player) => p.client === client)!.disconnected = true;
	}
};
