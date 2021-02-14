import {useState} from 'react';

export default function CreateRoomForm({socket, finish} : {socket: SocketIOClient.Socket; finish: (s: string) => void}) {
	const [name, setName] = useState('');
	const [password, setPassword] = useState('');
	const [waiting, setWaiting] = useState(false);
	const [error, setError] = useState('');

	return (
		<>
			<p>Create Room</p>
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
					socket.emit('createRoom', name, password);
					socket.once('createRoomRes', (data: {success: boolean; error?: string}) => {
						setWaiting(false);
						if(data.success)
							finish(name);
						else
							setError(data.error!);
					});
				}}
				disabled={!name || waiting}
			>
				Create
			</button>
			{waiting && 'Creating room...'}
			<p style={{color: 'red'}}>{error}</p>
		</>
	);
};
