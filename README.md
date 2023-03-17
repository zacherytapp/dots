# Zakk's Dotfiles

#### Overview
This Mostly used for Salesforce/Javascript development - but trying to use some semi-sane defaults.

#### Install Instructions

You can replace `config` with anything - ensure it's aliased in any bash/config files.

1. `echo ".cfg" >> .gitignore`
2. `git clone <remote-git-repo-url> $HOME/.cfg`
3. `alias config='/usr/bin/git --git-dir=$HOME/.cfg/.git --work-tree=$HOME'`
4. `config config --local status.showUntrackedFiles no`
5. `config checkout`
