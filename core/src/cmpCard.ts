import Card from './Card';
import realRank from './realRank';

export default function cmpCard(a: Card, b: Card) {
	if (a.rank !== b.rank)
		return realRank(a) - realRank(b);
	return a.suit - b.suit;
};
