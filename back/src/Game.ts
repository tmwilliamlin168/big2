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
	disconnectListener?: () => void;
	rank = 0;
	passed = false;
	constructor(game: Game, client: Client) {
		this.game = game;
		this.client = client;
	}
	sendGameState() {
		this.cards.sort(cmpCard);
		const i = this.game.players.indexOf(this);
		const otherPlayers = [];
		for (let j = 1; j < this.game.players.length; ++j)
			otherPlayers.push(this.game.players[(i + j) % this.game.players.length]);
		this.client.socket.emit('gameState', {
			cards: this.cards,
			rank: this.rank,
			passed: this.passed,
			players: otherPlayers.map((p: Player) => ({
				username: p.client.username,
				numCards: p.cards.length,
				rank: p.rank,
				passed: p.passed
			})),
			lastPlayed: this.game.lastPlayed,
			lastPlayedPlayer: this.game.lastPlayedPlayer < 0 ? null : this.game.players[this.game.lastPlayedPlayer].client.username,
			playerTurn: this.game.players[this.game.playerTurn].client.username
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
		console.log('Game started');
		this.room = room;
		this.start();
	}
	async start() {
		const cards = [];
		for (let i = 1; i <= 13; ++i)
			for (let j = 0; j < 4; ++j)
				cards.push({rank: i, suit: j});
		for (let i = 0; i < 52; ++i) {
			const j = Math.floor(Math.random() * (i+1));
			[cards[i], cards[j]] = [cards[j], cards[i]];
		}
		const handSize = Math.floor(52 / this.room.clients.length);
		for (let i = 0; i < this.room.clients.length; ++i) {
			this.players.push(new Player(this, this.room.clients[i]));
			this.players[i].cards = cards.slice(i * handSize, (i + 1) * handSize);
		}
		const startingPlayer = this.players.find((p: Player) => p.cards.some(
			(card: Card) => card.rank === 3 && card.suit === Suit.Clubs
		)) || this.players[0];
		if (this.room.clients.length === 3)
			 startingPlayer.cards.push(cards[51]);
		this.playerTurn = this.players.indexOf(startingPlayer);
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
		this.broadcastGameState();
		setTimeout(() => {
			server.to(this.room.name).emit('endGame');
			this.room.game = null;
		}, 5000);
	}
	broadcastGameState() {
		console.log('broadcast');
		this.players.forEach((p: Player) => p.sendGameState());
	}
	async round() {
		console.log('start round');
		while (true) {
			// Everyone passes
			if (this.playerTurn === this.lastPlayedPlayer) break;
			const p = this.players[this.playerTurn];
			// Guy passes
			if (p.rank || p.disconnected || p.passed) {
				this.playerTurn = (this.playerTurn + 1) % this.players.length;
				continue;
			}
			await this.turn();
			this.playerTurn = (this.playerTurn + 1) % this.players.length;
			// Check if person ends
			if (p.rank)
				break;
		}
		this.lastPlayed = null;
		this.lastPlayedPlayer = -1;
		this.players.forEach((p: Player) => p.passed = false);
	}
	async turn() {
		console.log('start turn', this.playerTurn);
		const p = this.players[this.playerTurn];
		if (p.passed) return;
		this.broadcastGameState();
		await new Promise<void>(resolve => {
			p.client.socket.once('turn', cards => {
				delete p.disconnectListener;
				(() => {
					// Pass
					if (cards === null) {
						p.passed = true;
						return;
					}
					// Play
					console.log('got cards', cards);
					if (cards && Array.isArray(cards) && cards.every((a: Card) => a && p.cards.some((b: Card) => !cmpCard(a, b))) && canPlay(this.lastPlayed, cards)) {
						// Cards have to be ascending
						let ok = true;
						for (let i = 0; i + 1 < cards.length; ++i)
							ok = ok && cmpCard(cards[i], cards[i + 1]) < 0;
						if (ok) {
							// Remove cards
							p.cards = p.cards.filter((a: Card) => !cards.some((b: Card) => !cmpCard(a, b)));
							// Check if won
							if (!p.cards.length)
								p.rank = ++this.playersFinished;
							this.lastPlayed = cards;
							this.lastPlayedPlayer = this.playerTurn;
							return;
						}
					}
					p.client.socket.disconnect();
					logSocket(p.client.socket, 'Bad cards argument on turn');
				})();
				resolve();
			});
			p.disconnectListener = () => {
				delete p.disconnectListener;
				p.client.socket.removeAllListeners('turn');
				resolve();
			};
		});
	}
	updateSocket(client: Client) {
		this.players.find((p: Player) => p.client === client)!.sendGameState();
	}
	remove(client: Client) {
		const p = this.players.find((p: Player) => p.client === client)!;
		p.disconnected = true;
		if (p.disconnectListener)
			p.disconnectListener();
	}
};
