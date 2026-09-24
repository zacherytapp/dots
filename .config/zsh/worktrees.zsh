# git worktree helpers, ported from folke/dot's config/fish/conf.d/git.fish.
# Worktrees go in $GIT_WORKTREES_ROOT/<repo>-<branch>, apart from the
# .claude/worktrees/ ones Claude Code manages.
#
#   gw <branch>  cd into the branch's worktree, creating it (and the branch) if needed
#   gpr <pr>     check out a GitHub PR in its own worktree and cd there
#   gwl          fzf: cd into another worktree of this repo
#   gwr          fzf: remove a worktree (cd's to the main one first)
#   gwm          main worktree <-> the last (or newest) other worktree
#
# Never name a local `path` in here: zsh ties it to $PATH.

: ${GIT_WORKTREES_ROOT:=$HOME/projects/git-worktrees}

# oh-my-zsh's git plugin aliases gpr to `git pull --rebase`, and an alias
# would win over the function
unalias gw gpr gwl gwr gwm 2>/dev/null

# every worktree of the current repo, main first
function _gw_list {
  local out
  out=$(git worktree list --porcelain 2>/dev/null) || {
    print -u2 "not in a git repo"
    return 1
  }
  print -rl -- ${${(M)${(f)out}:#worktree *}#worktree }
}

function _gw_main {
  local -a wts
  wts=(${(f)"$(_gw_list)"}) && (( $#wts )) || return 1
  print -r -- $wts[1]
}

function gw {
  (( $# )) || { gwm; return }
  local branch=$1 main dir
  main=$(_gw_main) || return
  dir=$GIT_WORKTREES_ROOT/${main:t}-${branch//\//_}
  if [[ ! -d $dir ]]; then
    mkdir -p $GIT_WORKTREES_ROOT || return
    # an existing local branch, or a remote one that git will track (DWIM)
    if git show-ref --verify --quiet refs/heads/$branch ||
      [[ -n $(git for-each-ref --format=x "refs/remotes/*/$branch") ]]; then
      git worktree add $dir $branch || return
    else
      git worktree add -b $branch $dir || return
    fi
  fi
  cd $dir
}

function gpr {
  (( $# )) || { print -u2 "usage: gpr <pr>"; return 1 }
  local pr=$1 main branch dir
  main=$(_gw_main) || return
  branch=$(gh pr view $pr --json headRefName --jq .headRefName) || return
  dir=$GIT_WORKTREES_ROOT/${main:t}-$pr-${branch//\//_}
  if [[ ! -d $dir ]]; then
    mkdir -p $GIT_WORKTREES_ROOT || return
    git worktree add --detach $dir || return
    if ! (cd $dir && gh pr checkout $pr); then
      git worktree remove --force $dir
      return 1
    fi
  fi
  cd $dir
}

function gwl {
  local here dir
  here=$(git rev-parse --show-toplevel) || return
  dir=$(_gw_list | grep -vxF -- $here | fzf --prompt='worktree> ') || return
  cd $dir
}

function gwr {
  local main dir
  main=$(_gw_main) || return
  dir=$(_gw_list | grep -vxF -- $main | fzf --prompt='remove worktree> ') || return
  cd $main && git worktree remove $dir
}

function gwm {
  local main here
  local -a others
  main=$(_gw_main) || return
  here=$(git rev-parse --show-toplevel) || return
  if [[ $here != $main ]]; then
    typeset -g _GW_LAST=$here
    cd $main
    return
  fi
  others=(${(f)"$(_gw_list)"})
  others=(${others:#$main})
  if [[ -n $_GW_LAST && ${others[(Ie)$_GW_LAST]} -gt 0 ]]; then
    cd $_GW_LAST
    return
  fi
  local newest
  (( $#others )) && newest=$(ls -dt -- $others 2>/dev/null | head -1)
  [[ -n $newest ]] || { print -u2 "no other worktrees"; return 1 }
  cd $newest
}
