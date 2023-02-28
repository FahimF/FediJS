class Mastodon {
	static #shared;

	static Tabs = {
		None: "none",
		Default: "default",
		Home: "home",
		Notifications: "notifications",
		Mentions: "mentions",
		DM: "dm",
		Favourites: "favourites",
		Bookmarks: "bookmarks",
		Settings: "settings"
	}

	constructor() {
		// Singleton handling - do we have an existing shared?
		if (Mastodon.#shared) {
			console.log('Returning shared instance of Mastodon Client');
			return Mastodon.#shared;
		}
		Mastodon.#shared = this;
		console.log('Created new Mastodon Client');
		let instance = localStorage.instance;
		if (instance.indexOf('://') == -1) {
			instance = 'https://' + instance;
		}
		this.instance = instance;
		this.token = localStorage.access_token;
	}

	async get(endpoint, options) {
		let url = this.instance + endpoint + '?' + new URLSearchParams(options);
		const res = await fetch(url, {
			headers: {
				'Authorization': 'Bearer ' + this.token,
			},
		});
		console.log(res);
		if (res.status == 401) {
			throw 401;
		}
		return res.json();
	}

	async post(endpoint, body) {
		const fd = new FormData();
		for (let key in body) fd.append(key, body[key]);
		const res = await fetch(this.instance + endpoint, {
			method: 'POST',
			body: fd,
		});
		return res.json();
	}

	async oauth_login() {
		let redir = window.location.href;
		redir = redir.substring(0, redir.lastIndexOf('/')) + '/oauth.html';
		let res = await this.post('/api/v1/apps', {
			client_name: 'MastoBite',
			redirect_uris: redir,
			scopes: 'read',
			website: 'https://github.com/FahimF/MastoBite',
		});
		localStorage.oauth = JSON.stringify(res);
		window.location = this.instance + '/oauth/authorize?' + new URLSearchParams({
			client_id: res.client_id,
			scope: 'read',
			redirect_uri: redir,
			response_type: 'code'
		});
	}

	async oauth_token(code) {
		let oauth = JSON.parse(localStorage.oauth);
		let res = await this.post('/oauth/token', {
			client_id: oauth.client_id,
			client_secret: oauth.client_secret,
			redirect_uri: oauth.redirect_uri,
			grant_type: 'authorization_code',
			code: code,
			scope: 'read',
		});
		localStorage.access_token = res.access_token;
	}

	async verify_user() {
		let res = await this.get('/api/v1/accounts/verify_credentials');
		localStorage.user = res;
	}

	// Returns a list of Status items matching given timeline
	async get_posts(timeline, opts) {
		// Non-timeline options: bookmarks, favourites
		if (['bookmarks', 'favourites'].includes(timeline)) {
			return this.get(`/api/v1/${timeline}`, opts);
		}
		// Timeline options: public, tag/:hashtag, home, list/:list_id
		return this.get(`/api/v1/timelines/${timeline}`, opts);
	}

	async get_notifications(opts) {
		// Includes: mention, status, reblog, follow, follow_request, favourite, poll, update, admin.sign_up, admin.report
		if (!opts) {
			opts = {};
		}
		opts['types[]'] = 'mention';
		return this.get(`/api/v1/notifications`, opts);
	}

	async get_mentions(opts) {
		// Fetch just mentions from notifications list
		if (!opts) {
			opts = {};
		}
		opts['exclude_types[]'] = 'mention';
		return this.get(`/api/v1/notifications`, opts);
	}
}
