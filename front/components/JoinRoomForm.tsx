import {useState} from 'react';

export default function JoinRoomForm({socket} : {socket: SocketIOClient.Socket}) {
	const [name, setName] = useState('');
	const [password, setPassword] = useState('');
	const [waiting, setWaiting] = useState(false);
	const [error, setError] = useState('');

	return (
		<>
			<p>Join Room</p>
			<input
				type="text"
				maxLength={15}
				placeholder="Room name..."
				value={name}
				onChange={(e) => setName(e.target.value)}
				disabled={waiting}
			/>
			<input
				type="text"
				maxLength={15}
				placeholder="Password..."
				value={password}
				onChange={(e) => setPassword(e.target.value)}
				disabled={waiting}
			/>
			<button
				onClick={() => {
					setWaiting(true);
					socket.emit('joinRoom', name, password);
					socket.once('joinRoomRes', (data: {success: boolean; error?: string}) => {
						setWaiting(false);
						if (!data.success)
							setError(data.error!);
					});
				}}
				disabled={!name || waiting}
			>
				Join
			</button>
			{waiting && 'Joining room...'}
			<p style={{color: 'red'}}>{error}</p>
		</>
	);
};
