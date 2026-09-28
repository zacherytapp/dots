; extends

; anchored at the start so prose like "please update your settings" is not treated as SQL
([
  (interpreted_string_literal_content)
  (raw_string_literal_content)
  ] @injection.content
 (#match? @injection.content "\\v\\c^\\s*(select\\s.+\\sfrom|insert\\s+into|update\\s+\\S+\\s+set|delete\\s+from|with\\s+\\S+\\s+as)\\s")
 (#set! injection.language "sql"))

(const_spec
  name: (identifier)
  value: (expression_list
    (raw_string_literal
      (raw_string_literal_content) @injection.content
      (#lua-match? @injection.content "^%s*{.*}%s*$")
      (#set! injection.language "json"))))

(short_var_declaration
  left: (expression_list (identifier))
  right: (expression_list
    (raw_string_literal
      (raw_string_literal_content) @injection.content))
  (#lua-match? @injection.content "^%s*{.*}%s*$")
  (#set! injection.language "json"))

(var_spec
  name: (identifier)
  value: (expression_list
    (raw_string_literal
      (raw_string_literal_content) @injection.content
      (#lua-match? @injection.content "^%s*{.*}%s*$")
      (#set! injection.language "json"))))
