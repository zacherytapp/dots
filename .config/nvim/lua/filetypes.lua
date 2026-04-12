vim.filetype.add({
	extension = {
		-- Apex files
		cls = "apex",
		apex = "apex",
		trigger = "apex",
		apexcode = "apex",
		apxc = "apex", -- Apex class alternative extension
		-- SOQL/SOSL
		soql = "soql",
		sosl = "sosl",
		-- Visualforce
		page = "visualforce",
		component = "visualforce",
		-- Aura components (excluded from formatters)
		cmp = "aura",
		auradoc = "aura",
		app = "xml", -- Aura app files
		evt = "xml", -- Aura event files
		intf = "xml", -- Aura interface files
		design = "xml", -- Aura design files
		tokens = "xml", -- Aura tokens
		-- Jinja templates
		jinja = "jinja",
		jinja2 = "jinja",
		j2 = "jinja",
		-- Terraform
		tfvars = "terraform-vars",
		-- Other
		tmpl = "tmpl",
	},
	filename = {
		[".env"] = "dotenv",
		[".env.local"] = "dotenv",
		[".env.development"] = "dotenv",
		[".env.production"] = "dotenv",
		[".env.test"] = "dotenv",
		[".env.staging"] = "dotenv",
		[".env.example"] = "dotenv",
		[".zshrc"] = "sh",
		["sfdx-project.json"] = "jsonc",
		["tsconfig.json"] = "jsonc",
		["tsconfig.build.json"] = "jsonc",
		["jsconfig.json"] = "jsonc",
		[".babelrc"] = "jsonc",
		[".eslintrc.json"] = "jsonc",
		["devcontainer.json"] = "jsonc",
		[".forceignore"] = "gitignore",
	},
	pattern = {
		-- .env files with any suffix (.env.local, .env.staging, etc.)
		["%.env%..+"] = "dotenv",
		[".*/%.vscode/.*%.json"] = "jsonc",
		["apex-.*%.log"] = "sflog",
		-- Django templates: HTML files in templates directories
		[".*/templates/.*%.html"] = "htmldjango",
		[".*/templates/.*%.htm"] = "htmldjango",
		-- Jinja HTML templates
		[".*%.html%.j2"] = "jinja",
		[".*%.html%.jinja"] = "jinja",
		[".*%.html%.jinja2"] = "jinja",
	},
})
