#!/usr/bin/env bash

echo "Creating aliases for common paths..."

# updates .bashrc
cat << 'END' >> ~/.zshrc

# Common aliases:
alias documents='cd ~/Documents'
alias downloads='cd ~/Downloads'
alias desktop='cd ~/Desktop'
alias music='cd ~/Music'
alias pictures='cd ~/Pictures'
alias videos='cd ~/Videos'
alias media='cd /media/$(whoami)'
alias work ~/work
alias personal ~/personal

END

echo 'The following aliases have been created: documents, downloads, desktop, music, pictures, videos, media, projects'
