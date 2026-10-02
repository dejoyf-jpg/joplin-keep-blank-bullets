// Registers the Rich Text helper. A Markdown-it content script is the only
// supported way for a plugin to run code inside the Rich Text editor's document.
joplin.plugins.register({
	onStart: async function () {
		await joplin.contentScripts.register('markdownItPlugin', 'keepBlankBulletsRichText', './richTextBridge.js');
	},
});
