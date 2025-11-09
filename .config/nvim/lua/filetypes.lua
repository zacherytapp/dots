vim.filetype.add({
	extension = {
		cls = "apex",
		apex = "apex",
		trigger = "apex",
		soql = "soql",
		sosl = "sosl",
		page = "html",
		cmp = "html",
		auradoc = "html",
		tmpl = "tmpl",
	},
	filename = {
		[".zshrc"] = "sh",
	},
	pattern = {
		["apex-.*%.log"] = "sflog",
	},
})

-- vim.opt.listchars = {
-- 	eol = "↲",
-- 	tab = "→ ",
-- 	space = "·",
-- 	nbsp = "␣",
-- 	trail = "+",
-- 	extends = "→",
-- 	precedes = "←",
-- }
