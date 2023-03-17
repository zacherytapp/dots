local cmd = vim.cmd

-- Set all the filetypes (there's a better way to do this - I just haven't figured it out
cmd [[
    augroup FileTypeGroup
        au BufRead,BufNewFile *.cls,*.trigger,*.apex set filetype=apexcode | set syntax=apexcode
        au BufRead,BufNewFile *.soql set filetype=apexcode | set syntax=sql
        au BufRead,BufNewFile project-scratch-def.json set filetype=scratch
        au BufRead,BufNewFile *.vue,*.svelte,*.jsw,*.cmp,*.page set filetype=html
        au BufRead,BufNewFile *.tsx,*.jsw set filetype=javascript
        au BufRead,BufNewFile *.jsx set filetype=javascript.jsx
    augroup END
]]
