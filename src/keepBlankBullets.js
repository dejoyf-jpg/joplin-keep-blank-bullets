// Runs inside the Rich Text editor document: TinyMCE on desktop, the ProseMirror
// editor's web view on mobile.
//
// Joplin saves a note by converting the editor's HTML to Markdown, and that
// conversion drops a list item with nothing in it. On desktop the editor then
// redraws from the saved Markdown (after a sync, an attachment event, or an edit
// in another window) and the empty item disappears from the screen. On mobile the
// item is gone the next time the note opens.
//
// Save side: an empty <li> is handed to the converter holding the literal text
// "&nbsp;", so the Markdown keeps the line as "- &nbsp;" (Joplin's own form for
// an empty paragraph). Load side: an item holding only a non-breaking space is
// emptied again, so typing into it leaves no stray space behind.
(function () {
	var NBSP = String.fromCharCode(160);
	var HOLDER_TEXT = '&nbsp;';
	// Content that makes an item non-empty even with no text in it.
	var MEANINGFUL = 'img,hr,table,ul,ol,pre,iframe,video,audio,svg,object';

	// ------------------------------------------------------------ desktop ---
	var EMPTY_LI = /<li((?:\s[^>]*)?)>(?:\s|<br\s*\/?>)*<\/li>/g;

	// The second form is the save-side holder itself, which comes back as literal
	// text when something reads the editor's HTML and sets it again.
	function holdsOnlyNbsp(li) {
		if (li.textContent !== NBSP && li.textContent !== HOLDER_TEXT) return false;
		for (var n = li.firstChild; n; n = n.nextSibling) {
			if (n.nodeType === 1 && n.nodeName !== 'BR') return false;
		}
		return true;
	}

	function emptyHeldItems(ed) {
		var items = ed.getBody().getElementsByTagName('li');
		for (var i = 0; i < items.length; i++) {
			if (holdsOnlyNbsp(items[i])) items[i].innerHTML = '<br data-mce-bogus="1">';
		}
	}

	function findEditor() {
		try {
			var tm = window.parent && window.parent !== window ? window.parent.tinymce : null;
			if (!tm || typeof tm.get !== 'function') return null;
			var eds = tm.get();
			for (var i = 0; i < eds.length; i++) {
				if (eds[i].getWin && eds[i].getWin() === window) return eds[i];
			}
		} catch (e) {
			/* not inside the desktop Rich Text editor */
		}
		return null;
	}

	// An HTML-format note is saved as HTML, which keeps an empty item on its own, and
	// the holder would show there as visible text. Joplin attaches this script to the
	// editor document only for a Markdown note, so its tag is the signal.
	function markdownNoteOpen() {
		return !!document.querySelector('script[src*="keepBlankBullets"]');
	}

	function register() {
		var ed = findEditor();
		if (!ed) return false;
		if (ed.__keepBlankBullets) return true;
		ed.__keepBlankBullets = true;
		ed.on('GetContent', function (e) {
			if (e.selection || (e.format && e.format !== 'html') || typeof e.content !== 'string') return;
			if (!markdownNoteOpen()) return;
			e.content = e.content.replace(EMPTY_LI, '<li$1>&amp;nbsp;</li>');
		});
		ed.on('SetContent', function () {
			emptyHeldItems(ed);
		});
		// The note on screen was drawn before this script loaded.
		emptyHeldItems(ed);
		return true;
	}

	// ------------------------------------------------------------- mobile ---
	// The mobile editor offers a plugin no event to hook, so the two DOM calls its
	// save and load paths make are wrapped instead (Joplin 3.7 source):
	//   save  the editor copies its document into a SEPARATE HTML document, then
	//         deep-clones the top element before converting it to Markdown
	//   load  the rendered note is parsed with DOMParser before the editor reads it
	// Both wrappers call the original first and only touch empty list items.

	function itemIsBlank(li) {
		if (li.querySelector(MEANINGFUL)) return false;
		var text = li.textContent.split(NBSP).join('');
		return text.trim() === '' || text.trim() === HOLDER_TEXT;
	}

	// A note drawn before this script loaded still has the non-breaking space in the
	// item, so text typed there sits beside it. Drop that one character at the edge.
	function trimHolderSpace(li) {
		var first = li.ownerDocument.createTreeWalker(li, 4).nextNode();
		if (!first) return;
		var parent = first.parentNode;
		while (parent && parent !== li) {
			if (/^(UL|OL)$/.test(parent.nodeName)) return;
			parent = parent.parentNode;
		}
		if (first.data.charAt(0) === NBSP) first.data = first.data.slice(1);
		else if (first.data.charAt(first.data.length - 1) === NBSP && first.data.trim() !== '') first.data = first.data.slice(0, -1);
	}

	function holdBlankItems(root) {
		var items = root.querySelectorAll ? root.querySelectorAll('li') : [];
		for (var i = 0; i < items.length; i++) {
			var li = items[i];
			if (!itemIsBlank(li)) {
				trimHolderSpace(li);
				continue;
			}
			var doc = li.ownerDocument;
			if (li.querySelector('input')) {
				// A checkbox item keeps its box; the holder goes after it.
				var texts = doc.createTreeWalker(li, 4);
				var t;
				while ((t = texts.nextNode())) t.data = '';
				li.appendChild(doc.createTextNode(HOLDER_TEXT));
			} else {
				li.textContent = HOLDER_TEXT;
			}
		}
	}

	function releaseHeldItems(root) {
		var items = root.querySelectorAll('li');
		for (var i = 0; i < items.length; i++) {
			var li = items[i];
			if (li.querySelector(MEANINGFUL)) continue;
			var text = li.textContent;
			if (text !== NBSP && text.trim() !== HOLDER_TEXT) continue;
			var texts = li.ownerDocument.createTreeWalker(li, 4);
			var t;
			while ((t = texts.nextNode())) t.data = '';
		}
	}

	function registerMobile() {
		if (window.__keepBlankBulletsMobile) return;
		window.__keepBlankBulletsMobile = true;

		var cloneNode = Node.prototype.cloneNode;
		Node.prototype.cloneNode = function (deep) {
			var copy = cloneNode.apply(this, arguments);
			try {
				// Only the save path clones a whole element that lives in a document with
				// no window. A lone <li> is the LOAD path reading a checkbox item.
				var doc = this.ownerDocument;
				if (deep && this.nodeType === 1 && this.nodeName !== 'LI' && doc && doc !== document && !doc.defaultView) {
					holdBlankItems(copy);
				}
			} catch (e) {
				/* never break a save */
			}
			return copy;
		};

		var parseFromString = DOMParser.prototype.parseFromString;
		DOMParser.prototype.parseFromString = function (_text, type) {
			var parsed = parseFromString.apply(this, arguments);
			try {
				if (type === 'text/html' && parsed) releaseHeldItems(parsed);
			} catch (e) {
				/* never break a load */
			}
			return parsed;
		};
	}

	// Exposed for the test rig; harmless in Joplin.
	window.keepBlankBulletsMobile = { register: registerMobile, hold: holdBlankItems, release: releaseHeldItems };

	if (window.ReactNativeWebView) {
		registerMobile();
	} else if (!register()) {
		var tries = 0;
		var timer = setInterval(function () {
			if (register() || ++tries >= 50) clearInterval(timer);
		}, 100);
	}
})();
