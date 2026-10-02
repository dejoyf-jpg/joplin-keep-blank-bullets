const TurndownService = require('@joplin/turndown');
const gfm = require('@joplin/turndown-plugin-gfm').gfm;
window.convertHtmlToMarkdown = (html) => {
	const t = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced', preserveImageTagsWithSize: true, preserveNestedTables: true, preserveTableStyles: true, preserveColorStyles: true, bulletListMarker: '-', emDelimiter: '*', strongDelimiter: '**', allowResourcePlaceholders: true, br: '  ' });
	t.use(gfm); t.remove('script'); t.remove('style');
	return t.turndown(html);
};
