import Card from './Card';

export default function cmpCard(a: Card, b: Card) {
	if (a.rank !== b.rank)
		return a.realRank() - b.realRank();
	return a.suit - b.suit;
};
