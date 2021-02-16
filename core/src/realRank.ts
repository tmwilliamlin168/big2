import Card from './Card';

export default function realRank(card: Card) {
	return (card.rank + 10) % 13;
}
