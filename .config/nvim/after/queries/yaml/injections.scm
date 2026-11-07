; extends

; two patterns because #contains? with several strings requires all of them
(block_mapping_pair
  value: [
    (block_node (block_scalar) @injection.content)
    (flow_node (double_quote_scalar) @injection.content)
  ]
  (#contains? @injection.content "{{")
  (#set! injection.language "jinja"))

(block_mapping_pair
  value: [
    (block_node (block_scalar) @injection.content)
    (flow_node (double_quote_scalar) @injection.content)
  ]
  (#contains? @injection.content "{%")
  (#set! injection.language "jinja"))
