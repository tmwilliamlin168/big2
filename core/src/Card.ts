import Suit from './Suit';

export default class Card {
	rank: number;
	suit: Suit;
	constructor(rank: number, suit: Suit) {
		this.rank = rank;
		this.suit = suit;
	}
	realRank() {
		return (this.rank + 10) % 13;
	}
};
