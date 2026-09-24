; extends

; adapted from https://github.com/folke/dot/blob/master/nvim/queries/markdown/injections.scm

; tsx for MDX-style import / export lines
(((inline) @_inline
  (#match? @_inline "^\(import\|export\)")) @injection.content
  (#set! injection.language "tsx"))
