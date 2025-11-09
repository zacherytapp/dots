local apex = {
	icon = "󰢎",
	color = "#009EDB",
	cterm_color = "65", -- seems to be the default value
	name = "Apex",
}

local visualforce = {
	icon = "",
	color = "#4E9A06",
	cterm_color = "71",
	name = "Visualforce",
}
local aura = {
	icon = "",
	color = "#4E9A06",
	cterm_color = "71",
	name = "Aura",
}
local tmpl = {
	icon = "󰲌",
	color = "#4E9A06",
	cterm_color = "71",
	name = "GoTmpl",
}

local gotmpl = {
	icon = "󰲌",
	color = "#4E9A06",
	cterm_color = "71",
	name = "GoTmpl",
}

local jinja = {
	icon = "󰜞",
	color = "#A61E3D",
	cterm_color = "167",
	name = "Jinja",
}

local caddy = {
	icon = "󰚩",
	color = "#6F4E37",
	cterm_color = "137",
	name = "Caddy",
}

return {
	"nvim-tree/nvim-web-devicons",
	opts = {
		override = {
			apex = apex,
			cls = apex,
			page = visualforce,
			cmp = aura,
			auradoc = aura,
			design = aura,
			tmpl = tmpl,
			gotmpl = gotmpl,
			jinja = jinja,
			jinja2 = jinja,
			j2 = jinja,
			caddy = caddy,
		},
	},
}
