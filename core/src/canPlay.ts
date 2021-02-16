import Card from './Card';
import cmpCard from './cmpCard';

class Hand {
	size: number;
	overrideSize: boolean;
	matchFunc: (cards: Card[]) => Card | null;
	constructor(size: number, overrideSize: boolean, matchFunc: (cards: Card[]) => Card | null) {
		this.size = size;
		this.overrideSize = overrideSize;
		this.matchFunc = matchFunc;
	}
	match(cards: Card[]) {
		return cards.length === this.size && this.matchFunc(cards);
	}
}

const chkFlush = (cards: Card[]) => cards.every((card: Card) => card.suit === cards[0].suit);
const chkStraight = (cards: Card[]) => {
	let ok = true;
	for (let i = 1; i < 5; ++i)
		ok = ok && cards[0].realRank() + i === cards[i].realRank();
	if (ok) return true;
	// 3 4 5 6 2
	ok = cards[4].rank === 2;
	for (let i = 0; i < 4; ++i)
		ok = ok && cards[0].rank === 3 + i;
	if (ok) return true;
	return false;
};

const hands = [
	// Straight Flush
	new Hand(5, true, (cards: Card[]) => chkFlush(cards) && chkStraight(cards) ? cards[4] : null),
	// Four of a Kind
	new Hand(5, true, (cards: Card[]) =>
		(cards[0].rank === cards[3].rank ? cards[3] : null) ||
		(cards[1].rank === cards[4].rank ? cards[4] : null)
	),
	// Full House
	new Hand(5, false, (cards: Card[]) =>
		(cards[0].rank === cards[2].rank && cards[3].rank === cards[4].rank ? cards[2] : null) ||
		(cards[0].rank === cards[1].rank && cards[2].rank === cards[4].rank ? cards[4] : null)
	),
	// Straight
	new Hand(5, false, (cards: Card[]) => chkStraight(cards) ? cards[4] : null),
	// Flush
	new Hand(5, false, (cards: Card[]) => chkFlush(cards) ? cards[4] : null),
	// Pair
	new Hand(2, false, (cards: Card[]) => cards[0].rank === cards[1].rank ? cards[1] : null),
	// Single
	new Hand(1, false, (cards: Card[]) => cards[0])
];

const parseHand = (cards: Card[]) => {
	for (let i = 0; i < hands.length; ++i) {
		const card = hands[i].match(cards);
		if (card) return {id: i, card};
	}
	return null;
};

export default function canPlay(prev: Card[] | null, cur: Card[]) {
	const curHand = parseHand(cur);
	if (!curHand) return false;
	if (!prev) return true;
	const prevHand = parseHand(prev)!;
	if (!hands[curHand.id].overrideSize && cur.length !== prev.length) return false;
	if (curHand.id !== prevHand.id) return curHand.id < prevHand.id;
	return cmpCard(prevHand.card, curHand.card) < 0;
};
