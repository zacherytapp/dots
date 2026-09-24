; extends

; adapted from https://github.com/folke/dot/blob/master/nvim/queries/yaml/injections.scm
; folke uses twig because there was no jinja grammar; the jinja parser is installed
; here (plugins/lang/python-templates.lua), so use it directly.
; Two patterns because #contains? with several strings requires all of them.

; jinja in values containing {{ }} (ansible, github actions, ...)
(block_mapping_pair
  value: [
    (block_node (block_scalar) @injection.content)
    (flow_node (double_quote_scalar) @injection.content)
  ]
  (#contains? @injection.content "{{")
  (#set! injection.language "jinja"))

; jinja in values containing {% %}
(block_mapping_pair
  value: [
    (block_node (block_scalar) @injection.content)
    (flow_node (double_quote_scalar) @injection.content)
  ]
  (#contains? @injection.content "{%")
  (#set! injection.language "jinja"))
