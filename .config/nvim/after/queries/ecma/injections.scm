; extends

; adapted from https://github.com/folke/dot/blob/master/nvim/queries/ecma/injections.scm
; ecma is the shared base for javascript, typescript, jsx and tsx.

; sql (requires the `sql` treesitter parser)
; e.g. db.query("SELECT * FROM users"), this.database.exec(`...`)
(call_expression
  function: (member_expression
    object: [
      (identifier) @_obj
      (member_expression
        property: (property_identifier) @_obj)
      (member_expression
        property: (private_property_identifier) @_obj)
    ]
    property: (property_identifier) @_name)
  arguments: [
    (arguments
      (template_string) @injection.content)
    (arguments
      (string) @injection.content)
    (template_string) @injection.content
  ]
  (#any-of? @_obj "db" "database" "#db")
  (#any-of? @_name
    "exec" "query" "execute" "executeQuery" "executeUpdate" "executeBatch" "prepareStatement" "run"
    "prepare" "prepareQuery" "prepareUpdate" "prepareBatch")
  (#set! injection.language "sql")
  ; strip the surrounding quotes / backticks
  (#offset! @injection.content 0 1 0 -1)
  (#set! injection.include-children))
