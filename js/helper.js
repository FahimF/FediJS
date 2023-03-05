let masto = new Mastodon();

const tabIDs = {[Mastodon.Tabs.Home]: "timeline", [Mastodon.Tabs.Notifications]: "notifs",
	[Mastodon.Tabs.Mentions]: "mentions", [Mastodon.Tabs.DM]: "messages",
	[Mastodon.Tabs.Favourites]: "favourites", [Mastodon.Tabs.Bookmarks]: "bookmarks",
	[Mastodon.Tabs.Settings]: "settings"};

const tabData = {[Mastodon.Tabs.Home]: {}, [Mastodon.Tabs.Notifications]: {}, [Mastodon.Tabs.Mentions]: {},
	[Mastodon.Tabs.DM]: {}, [Mastodon.Tabs.Favourites]: {}, [Mastodon.Tabs.Bookmarks]: {}};

function switchTab(tab = Mastodon.Tabs.Default) {
	// If not logged in, we have to login
	if (!localStorage.server_url || !localStorage.access_token) {
		// Show login section
		showItem("login", true);
		return;
	}
	// We are logged in, if default is specified, we have to get the default
	if (tab == Mastodon.Tabs.Default) {
		if (!localStorage.currentTab) {
			tab = Mastodon.Tabs.Home;
		} else {
			tab = localStorage.currentTab
		}
	} else {
		// There was a previous tab open, hide it
		let ptab = localStorage.currentTab
		let tid = tabIDs[ptab];
		showItem(tid, false);
		// Remove active status from tab
		toggleActive("n_" + tid, false);
	}
	localStorage.currentTab = tab;
	let tid = tabIDs[tab];
	showItem(tid, true);
	// Set active status for tab
	toggleActive("n_" + tid, true);
	if (tab == Mastodon.Tabs.Settings) {
		// Show Settings screen
	} else {
		// Show timeline
		showTimeline(tab, tid);
	}
}

function showTimeline(tab, tid) {
	try {
		let listIDs = [];
		let idTarget = '';
		let data = localStorage.getItem(tid);
		if (data) {
			let json = JSON.parse(data);
			// Prune data older than a given number of days
			let maxDays = -5;
			let max = new Date().addDays(maxDays).toISOString();
			let arr = Object.values(json);
			let toDelete = arr.filter((item) => {
				return item.created_at < max;
			});
			toDelete.forEach(d => delete json[d.id]);
			// Set data
			tabData[tab] = json;
			// Update data - get current max ID
			listIDs = Object.keys(json).sort();
			idTarget = listIDs.reverse()[0];
		}

		// Get a page via API call
		async function getPage(max_id = null) {
			let opts = {limit: 40};
			if (max_id) {
				opts.max_id = max_id;
			}
			let posts = [];
			showStatus(`Have ${listIDs.length} items, loading more...`);
			if (tab == Mastodon.Tabs.Home) {
				posts = await masto.get_posts('home', opts);
			} else if (tab == Mastodon.Tabs.Notifications) {
				posts = await masto.get_notifications(opts);
			} else if (tab == Mastodon.Tabs.Bookmarks) {
				posts = await masto.get_posts('bookmarks', opts);
			} else if (tab == Mastodon.Tabs.Favourites) {
				posts = await masto.get_posts('favourites', opts);
			}
			console.log(`Got: ${posts.length} items`)
			posts.forEach((post) => {
				tabData[tab][post.id] = post;
				renderTimeline(tab, tid, tabData[tab]);
			});
			if (posts.length > 0) {
				max_id = posts[posts.length - 1].id;
			}
			// TODO: Look at this logic more closely, currently it keeps loading more items indefinitely
			// if ((idTarget.length > 0 || max_id > idTarget) && posts.length > 0) {
			// 	await getPage(max_id);
			// } else {
				showStatus(`Have ${listIDs.length}, done for now.`);
			// }
		}

		getPage().catch((e) => {
			if (e == 401) {
				showStatus('Invalid access token. Check your settings.', 'danger')
			}
			console.log(e);
		}).then(() => {
			let json = tabData[tab];
			let cnt = Object.keys(json).length;
			console.log(`Done. Saving ${cnt} timeline items...`);
			let str = JSON.stringify(json);
			localStorage.setItem(tid, str);
		});
	} catch(e) {
		console.log(`Error loading timeline in showTimeline: ${e}`);
	}
}

// TODO somehow indicate that a timeline has finished loading / show newly loaded posts
function renderTimeline(tab, tid, data) {
	let mainEl = document.getElementById(tid);
	if (!mainEl) {
		console.log(`Could not find timeline DIV: ${tid}`);
	}
	for (const did in data) {
		insertIfMissing(mainEl, did, a => a.sort().reverse(), () => {
			let item = data[did];
			const card = createElementObj('div', {classList: 'card'});
			if ([Mastodon.Tabs.Home, Mastodon.Tabs.Bookmarks, Mastodon.Tabs.Favourites].includes(tab)) {
				return createPostCard(item, card);
			} else if (tab == Mastodon.Tabs.Notifications) {
				return createNotificationCard(item, card);
			}
		});
	}
}

function createElementObj(type, obj) {
	return Object.assign(document.createElement(type), obj);
}

function removeAllChildren(itemID) {
	let element = document.getElementById(itemID);
	while (element.firstChild) {
		element.removeChild(element.firstChild);
	}
}

function insertIfMissing(parent, key, sortFn, elFn) {
	if (!parent.fwChildren) parent.fwChildren = {};
	let collection = parent.fwChildren;
	if (!collection[key]) {
		let el = elFn()
		collection[key] = el;
		let others = sortFn(Object.keys(collection));
		let firstBigger = collection[others[others.indexOf(key) + 1]];
		parent.insertBefore(el, firstBigger);
	}
	return collection[key];
}

function nickCompare(a, b) {
	let isLocal = (nick) => nick.indexOf('@') == -1;
	if (isLocal(a) && !isLocal(b)) return -1;
	if (!isLocal(a) && isLocal(b)) return 1;
	if (a < b) return -1;
	if (a > b) return 1;
	return 0;
}

function showStatus(msg, type = 'dark') {
	const wrapper = document.createElement('div')
	wrapper.innerHTML = [
		`<div class="alert alert-${type} alert-dismissible" role="alert">`,
		`   <div>${msg}</div>`,
		'   <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>',
		'</div>'
	].join('')
	document.getElementById('status').append(wrapper);
}

function showItem(cls, show) {
	let item = document.getElementById(cls);
	if (!item) {
		console.log(`Unknown item for show: ${cls}`)
	}
	if (item.style.display === "none" && show) {
		item.style.display = "block";
	} else if (item.style.display === "block" && !show) {
		item.style.display = "none";
	}
}

function toggleActive(cls, active) {
	let item = document.getElementById(cls);
	if (!item) {
		console.log(`Unknown item for show: ${cls}`)
	}
	if (active) {
		// Add active state
		item.classList.add("active");
	} else {
		// Remove active state
		item.classList.remove("active");
	}
}

function getTime(dt_str) {
	let diff = Date.parse(dt_str);
	let dt = new Date();
	dt.setTime(diff);
	return dt;
}

function createPostCard(post, card) {
	// Boost info
	if (post.reblog) {
		let booster = post.account.acct;
		let name = post.account.display_name;
		let dt = getTime(post.created_at)
		let dt_str = timeAgo(dt);
		post = post.reblog;
		const boost = createElementObj('div', {classList: 'boost'});
		boost.innerHTML = `<span><a href="/${booster}" ` +
		`class="boost-name muted"><bdi><strong>${name}</strong></bdi></a></span> boosted ` +
		`at: ${dt_str}`;
		card.appendChild(boost);
	}
	// Reply info
	if (post.in_reply_to_id) {
		card.appendChild(createElementObj('div', {
			classList: 'reply',
			innerText: 'reply', /* TODO link to full thread view */
		}));
	}
	// Info - author, time/date
	let acct = post.account.acct;
	let pid = post.id;
	let avatar = post.account.avatar_static;
	let name = post.account.display_name;
	let vis = 'Public';
	let vis_icon = 'fa-globe';
	if (post.visibility == 'unlisted') {
		vis = 'Unlisted';
		vis_icon = 'fa-lock-open';
	} else if (post.visibility == 'private') {
		vis = 'Private';
		vis_icon = 'fa-lock';
	} else if (post.visibility == 'direct') {
		vis = 'Direct';
		vis_icon = 'fa-envelope';
	}
	// Created or edited date, whichever applies
	let dt = timeAgo(getTime(post.created_at));
	let ed_str = "";
	if (post.edited_at) {
		let tmp = timeAgo(getTime(post.edited_at));
		ed_str = `<abbr title="Edited at: ${tmp}"> *</abbr>`;
	}
	// HTML for info
	const info = createElementObj('div', {classList: 'status_info'});
	let html = `<a href="/${acct}/${pid}" class="relative-time" target="_blank" ` +
	`rel="noopener noreferrer"><span class="visibility-icon"><i class="fa ${vis_icon}" ` +
	`title="${vis}"></i></span><time datetime="${post.created_at}" ` +
	`title="${dt}">${dt}</time>${ed_str}</a>`;
	html += `<a href="/${acct}" title="${acct}" class="display-name_a" target="_blank" ` +
	`rel="noopener noreferrer"><div class="avatar"><div class="avatar-overlay" ` +
	`style="width: 46px; height: 46px;"><div class="avatar-overlay-base"><div class="avatar_i" ` +
	`style="width: 46px; height: 46px;"><img src="${avatar}"></div></div></div></div>` +
	`<span class="display-name"><bdi><strong class="display-name_html">${name}</strong></bdi>` +
	`<span class="display-name_account">${acct}</span>` +
	`</span></a>`;
	info.innerHTML = html;
	card.appendChild(info);
	// Post content
	card.innerHTML += post.content;
	// Do we have images?
	let cnt = post.media_attachments.length;
	if (cnt > 0) {
		// We have images, add main gallery DIV
		let gal = createElementObj('div', {classList: 'media-gallery'});
		// Get HTML for items
		let cid = `image-carousel-${post.id}`;
		html = `<div id="${cid}" class="carousel">`;
		let ind = `<div class="carousel-indicators">`;
		let cin = `<div class="carousel-inner">`;
		for (const [ndx, m] of post.media_attachments.entries()) {
			ind += `<button type="button" data-bs-target="#${cid}" data-bs-slide-to="${ndx}" class="${ndx == 0 ? 'active' : ''}" aria-current="${ndx == 0 ? 'true' : ''}" aria-label="Slide ${ndx + 1}"></button>`;
			cin +=`<div class="carousel-item ${ndx == 0 ? 'active' : ''}">`;
			cin += `<a class="media-item-thumbnail" href="${m.url}" target="_blank" rel="noopener noreferrer">`;
			cin += `<img src="${m.preview_url}" class="d-block w-100" alt="${m.description}" title="${m.description}" />`;
			cin += "</a></div>";
		}
		ind += `</div>`;
		cin += `</div>`
		// Previous button
		cin += `<button class="carousel-control-prev" type="button" data-bs-target="#${cid}" data-bs-slide="prev">`;
		cin += `<span class="carousel-control-prev-icon" aria-hidden="true"></span>`;
		cin += `<span class="visually-hidden">Previous</span>`;
		cin += `</button>`;
		// Next button
		cin += `<button class="carousel-control-next" type="button" data-bs-target="#${cid}" data-bs-slide="next">`;
		cin += `<span class="carousel-control-next-icon" aria-hidden="true"></span>`;
		cin += `<span class="visually-hidden">Next</span>`;
		cin += `</button>`;
		// Put it all together
		html += ind + cin + `</div>`;
		gal.innerHTML = html;
		card.appendChild(gal);
	}
	// Actions
	let act = createElementObj('div', {classList: 'post-actions'});
	html = `<div class="hstack gap-3">`;
	html += `<button id='btn-rpl-${post.id}' type="button" class="btn btn-light btn-sm" onClick="replyClicked('${post.id}');">Reply</button>`;
	title = post.reblogged ? 'Unboost' : 'Boost';
	html += `<button id='btn-bst-${post.id}' type="button" class="btn btn-light btn-sm" onClick="boostClicked('${post.id}', ${post.reblogged});">${title}</button>`;
	title = post.favourited ? 'Unfavourite' : 'Favourite';
	html += `<button id='btn-fav-${post.id}' type="button" class="btn btn-light btn-sm" onClick="favouriteClicked('${post.id}', ${post.favourited});">${title}</button>`;
	title = post.bookmarked ? 'Unbookmark' : 'Bookmark';
	html += `<button id='btn-bkm-${post.id}' type="button" class="btn btn-light btn-sm" onClick="bookmarkClicked('${post.id}', ${post.bookmarked});">${title}</button>`;
	html += `</div>`;
	act.innerHTML = html;
	card.appendChild(act);
	return card;
}

function createNotificationCard(note, card) {
	// Notification info
	let user = note.account.acct;
	let name = note.account.display_name;
	let dt = getTime(note.created_at)
	let dt_str = timeAgo(dt);
	const boost = createElementObj('div', {classList: 'boost'});
	boost.innerHTML = `<span><a href="/${user}" ` +
	`class="boost-name muted"><strong>${name}</strong></a></span> ${note.type} ` +
	`at: ${dt_str}`;
	card.appendChild(boost);
	return card;
}

function createAccountCard(acct, card) {
	// Account info
	let user = acct.acct;
	let name = acct.display_name;
	let dt = getTime(acct.created_at)
	let dt_str = timeAgo(dt);
	const boost = createElementObj('div', {classList: 'boost'});
	boost.innerHTML = `<span><a href="/${user}" ` +
	`class="boost-name muted"><strong>${name}</strong></a></span> created ` +
	`at: ${dt_str}`;
	card.appendChild(boost);
	return card;
}

function replyClicked(postID) {
	alert("Reply not yet implemented.\nPost: " + postID);
}

async function boostClicked(postID, boosted) {
	if (boosted) {
		post = await masto.removeBoost(postID);
	} else {
		post = await masto.boost(postID);
	}
	if (post.error) {
		alert(post.error);
		return;
	}
	update(post);
	btn = document.getElementById(`btn-bst-${postID}`);
	if (btn) {
		btn.textContent = post.boosted ? 'Unboost' : 'Boost';
	}
}

async function favouriteClicked(postID, favourited) {
	if (favourited) {
		post = await masto.removeFavourite(postID);
	} else {
		post = await masto.Favourite(postID);
	}
	if (post.error) {
		alert(post.error);
		return;
	}
	update(post);
	btn = document.getElementById(`btn-fav-${postID}`);
	if (btn) {
		btn.textContent = post.favourited ? 'Unfavourite' : 'Favourite';
	}
}

async function bookmarkClicked(postID, bookmarked) {
	if (bookmarked) {
		post = await masto.removeBookmark(postID);
	} else {
		post = await masto.bookmark(postID);
	}
	if (post.error) {
		alert(post.error);
		return;
	}
	update(post);
	btn = document.getElementById(`btn-bkm-${postID}`);
	if (btn) {
		btn.textContent = post.bookmarked ? 'Unbookmark' : 'Bookmark';
	}
}

function update(post) {
	tab = localStorage.currentTab;
	let tid = tabIDs[tab];
	tabData[tab][post.id] = post;
	// Update data storage
	let json = tabData[tab];
	let str = JSON.stringify(json);
	localStorage.setItem(tid, str);
}

Date.prototype.addDays = function(days) {
    var date = new Date(this.valueOf());
    date.setDate(date.getDate() + days);
    return date;
}

function timeAgo(dt) {
	const locales = {year: 'y', month: 'mn', day: 'd', hour: 'h', minute: 'm', second: 's'};

	// Date to time interval
	let ti = dt.getTime();
	let seconds = Math.floor((new Date() - parseInt(ti)) / 1000);
	let interval = 0;
	let intervals = {
		year:   seconds / 31536000,
		month:  seconds / 2592000,
		day:    seconds / 86400,
		hour:   seconds / 3600,
		minute: seconds / 60
	};
	let txt = locales.second
	// We only do relative times for up to a week
	if (intervals[intervals.day] > 7) {
		return dt.toLocaleString();
	}
	// Get relative date
	for (const key in intervals) {
		interval = Math.floor(intervals[key]);
		if (interval > 1) {
			txt = locales[key];
			break;
		}
	}
	txt = interval.toString() + txt;
	return txt;
}
