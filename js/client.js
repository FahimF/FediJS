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
		var url = localStorage.server_url;
		if (url.indexOf('://') == -1) {
			url = 'https://' + url;
		}
		this.server_url = url;
		this.token = localStorage.access_token;
	}

	async get(endpoint, options) {
		let url = this.server_url + endpoint + '?' + new URLSearchParams(options);
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
		const res = await fetch(this.server_url + endpoint, {
			method: 'POST',
			body: fd,
			headers: {
				'Authorization': 'Bearer ' + this.token,
			},
		});
		return res.json();
	}

	async oauth_login() {
		let redir = window.location.href;
		redir = redir.substring(0, redir.lastIndexOf('/')) + '/oauth.html';
		let res = await this.post('/api/v1/apps', {
			client_name: 'FediJS',
			redirect_uris: redir,
			scopes: 'read write',
			website: 'https://github.com/FahimF/FediJS',
		});
		localStorage.oauth = JSON.stringify(res);
		window.location = this.server_url + '/oauth/authorize?' + new URLSearchParams({
			client_id: res.client_id,
			scope: 'read write',
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
			scope: 'read write',
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

	async bookmark(postID) {
		return this.post(`/api/v1/statuses/${postID}/bookmark`);
	}

	async removeBookmark(postID) {
		return this.post(`/api/v1/statuses/${postID}/unbookmark`);
	}

	async boost(postID) {
		return this.post(`/api/v1/statuses/${postID}/reblog`);
	}

	async removeBoost(postID) {
		return this.post(`/api/v1/statuses/${postID}/unreblog`);
	}

	async favourite(postID) {
		return this.post(`/api/v1/statuses/${postID}/favourite`);
	}

	async removeFavourite(postID) {
		return this.post(`/api/v1/statuses/${postID}/unfavourite`);
	}
}
