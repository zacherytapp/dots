; extends

; adapted from https://github.com/folke/dot/blob/master/nvim/queries/json/injections.scm

; bash in package.json scripts
; "scripts": { "build": "tsc && vite build" }
(pair
  key: (string
    (string_content) @_key)
  value: (object
    (pair
      value: (string
        (string_content) @injection.content)))
  (#eq? @_key "scripts")
  (#set! injection.language "bash"))
