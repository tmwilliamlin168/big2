import {useEffect} from 'react'
import io from 'socket.io-client'

export default function Game() {
	useEffect(() => {
		const socket = io(process.env.NEXT_PUBLIC_BACK_HOST!);
		return () => {socket.close()};
	}, []);
}
