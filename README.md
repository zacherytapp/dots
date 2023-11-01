# Zakk's Dotfiles

#### Overview
This Mostly used for Salesforce/Javascript development - but trying to use some semi-sane defaults.

#### Install Instructions

You can replace `config` with anything - ensure it's aliased in any bash/config files.

1. alias config='/usr/bin/git --git-dir=$HOME/.cfg/ --work-tree=$HOME'
2. `echo ".cfg" >> .gitignore`
3. `git clone --bare git@github.com:zacherytapp/dots.git $HOME/.cfg`
4. `alias config='/usr/bin/git --git-dir=$HOME/.cfg/ --work-tree=$HOME'`
5. `config config --local status.showUntrackedFiles no`
6. `config checkout`
