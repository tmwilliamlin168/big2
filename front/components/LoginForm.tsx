import {useEffect, useState} from 'react';

export default function LoginForm({finish, socket, username}: {finish: (s: string) => void, socket: SocketIOClient.Socket, username: string | null}) {
	const [value, setValue] = useState(username || '');
	const [waiting, setWaiting] = useState(false);
	const [error, setError] = useState('');

	const login = () => {
		setWaiting(true);
		socket.emit('login', value);
		socket.once('loginRes', (data: {success: boolean; error?: string}) => {
			setWaiting(false);
			if (data.success)
				finish(value);
			else
				setError(data.error!);
		});
	};

	useEffect(() => {
		if (username) login();
	}, []);

	return (
		<>
			<input
				type="text"
				maxLength={15}
				placeholder="Your username..."
				value={value}
				onChange={(e) => setValue(e.target.value)}
				disabled={waiting}
			/>
			<button onClick={login} disabled={!value || waiting}>
				Ok
			</button>
			{waiting && 'Logging in...'}
			<p style={{color: 'red'}}>{error}</p>
		</>
	);
};
