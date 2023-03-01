function input_localStorage(iId, bId, lId) {
	let i = document.getElementById(iId);
	let b = document.getElementById(bId);
	i.value = localStorage[lId];

	function updateDirty() {
		let dirty = i.value != localStorage[lId];
		b.disabled = !dirty;
	}

	i.oninput = updateDirty;
	b.onclick = () => {
		localStorage[lId] = i.value;
		updateDirty();
	};

	updateDirty();
}

input_localStorage('server_url', 'server_url-btn', 'server_url');
input_localStorage('token', 'token-btn', 'access_token');

document.getElementById('oauth-btn').onclick = (async () => {
	let masto = new Mastodon();
	masto.oauth_login();
});

