return {
  {
    "echasnovski/mini.indentscope",
    opts = {
      options = { border = "both", try_as_border = true },
      symbol = "│",
    },
    config = function(_, opts)
      require("mini.indentscope").setup(opts)
    end
  },
  {
    "echasnovski/mini.pairs",
    opts = { },
    config = function(_, opts)
      require("mini.pairs").setup(opts)
    end
  }
}
