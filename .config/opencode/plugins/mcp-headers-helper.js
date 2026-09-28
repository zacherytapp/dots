// Adds request headers to remote MCP servers from a helper command, like
// Claude Code's headersHelper. Each helper prints a JSON object of headers
// (see ~/.local/bin/mcp-bearer-header), so tokens stay out of opencode.jsonc
// and out of the environment opencode passes to its shell tool.
import { execFile } from "node:child_process"
import { homedir } from "node:os"
import { promisify } from "node:util"

const run = promisify(execFile)
const bearer = `${homedir()}/.local/bin/mcp-bearer-header`

// MCP server name -> helper argv.
const HELPERS = {
  context7: [bearer, "context7"],
  github: [bearer, "github"],
}

export const McpHeadersHelper = async ({ client }) => ({
  config: async (cfg) => {
    await Promise.all(
      Object.entries(HELPERS).map(async ([name, [cmd, ...args]]) => {
        const server = cfg.mcp?.[name]
        if (server?.type !== "remote" || server.enabled === false) return
        try {
          const { stdout } = await run(cmd, args, { timeout: 20_000 })
          server.headers = { ...server.headers, ...JSON.parse(stdout) }
        } catch (err) {
          // Only the exit reason is logged: stdout may hold a token. The
          // server still starts, without the headers.
          const reason = err.killed ? "timed out" : `exit ${err.code ?? err.name}`
          await client.app.log({
            body: {
              service: "mcp-headers-helper",
              level: "error",
              message: `headers helper for ${name} failed (${reason}); connecting without its headers`,
            },
          })
        }
      }),
    )
  },
})
