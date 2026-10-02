// Ships keepBlankBullets.js as an asset; adds no Markdown rules, so rendering is unchanged.
module.exports = {
	default: function (_context) {
		return {
			plugin: function (_markdownIt, _options) {},
			assets: function () {
				return [{ name: 'keepBlankBullets.js' }];
			},
		};
	},
};
