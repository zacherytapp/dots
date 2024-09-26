echo "Welcome! Let's start setting up your system. It could take more than 10 minutes, be patient"

echo "What name do you want to use in GIT user.name?"
echo "For example, mine will be \"Luke Morales\""
read git_config_user_name

echo "What email do you want to use in GIT user.email?"
echo "For example, mine will be \"lukemorales@live.com\""
read git_config_user_email

echo "What is your github username?"
echo "For example, mine will be \"lukemorales\""
read username

cd ~ && sudo apt-get update && sudo apt-get upgrade

echo 'Installing some dependencies'
sudo apt-get install kitty tmux git fzf ripgrep vim gimp flatpak xclip -y

echo 'Making directories'
mkdir work
mkdir personal

echo 'Installing curl' 
sudo apt-get install curl -y

echo 'Installing python stuff'
sudo apt-get install python3-pip -y
pip install virtualenvwrapper neovim
sudo pip install virtualenvwrapper

echo 'Installing neovim dependencies'
sudo apt-get install ninja-build cmake gcc make unzip gettext -y

echo 'Installing neovim'
git clone https://github.com/neovim/neovim
cd neovim && make CMAKE_BUILD_TYPE=RelWithDebInfo
sudo make install
cd ~

echo 'Installing NVM'
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash

echo 'Installing Ruby'
sudo apt-get install ruby-full -y

echo "Setting up your git global user name and email"
git config --global user.name "$git_config_user_name"
git config --global user.email $git_config_user_email

echo 'Generating a SSH Key'
ssh-keygen -t rsa -b 4096 -C $git_config_user_email
ssh-add ~/.ssh/id_rsa
cat ~/.ssh/id_rsa.pub | xclip -selection clipboard

echo 'Installing ZSH'
sudo apt-get install zsh -y
sh -c "$(wget https://raw.github.com/robbyrussell/oh-my-zsh/master/tools/install.sh -O -)"
chsh -s $(which zsh)

echo 'Installing Spotify' 
curl -sS https://download.spotify.com/debian/pubkey.gpg | sudo apt-key add -
echo "deb http://repository.spotify.com stable non-free" | sudo tee /etc/apt/sources.list.d/spotify.list
sudo apt-get update && sudo apt-get install spotify-client -y

echo 'Installing Peek' 
sudo add-apt-repository ppa:peek-developers/stable -y
sudo apt-get update && sudo apt-get install peek -y

echo 'Installing OBS Studio'
sudo apt-get install ffmpeg -y && sudo snap install obs-studio -y

echo 'Installing Zoom'
wget -c https://zoom.us/client/latest/zoom_amd64.deb
sudo dpkg -i zoom_amd64.deb
sudo apt-get install -f -y && rm zoom_amd64.deb

echo 'Installing FiraCode'
sudo apt-get install fonts-firacode -y

echo 'Installing Powerline Fonts'
sudo apt-get install fonts-powerline -y

echo 'Updating and Cleaning Unnecessary Packages'
sudo -- sh -c 'apt-get update; apt-get upgrade -y; apt-get full-upgrade -y; apt-get autoremove -y; apt-get autoclean -y'
clear

echo 'Installing Java JDK'
sudo apt-get install gnupg ca-certificates
curl -s https://repos.azul.com/azul-repo.key | sudo gpg --dearmor -o /usr/share/keyrings/azul.gpg
echo "deb [signed-by=/usr/share/keyrings/azul.gpg] https://repos.azul.com/zulu/deb stable main" | sudo tee /etc/apt/sources.list.d/zulu.list
sudo apt-get update -y
sudo apt-get install zulu21-jdk

sudo apt-get install gnome-tweaks

echo 'Installing PHP'
sudo apt install php-cli -y
cd ~
curl -sS https://getcomposer.org/installer -o /tmp/composer-setup.php
sudo php /tmp/composer-setup.php --install-dir=/usr/local/bin --filename=composer

echo 'Changing gsettings'
gsettings set org.gnome.desktop.wm.keybindings switch-to-workspace-5 "['<Super>5']"
gsettings set org.gnome.desktop.wm.keybindings switch-to-workspace-6 "['<Super>6']"
gsettings set org.gnome.desktop.wm.keybindings switch-to-workspace-7 "['<Super>7']"
gsettings set org.gnome.desktop.wm.keybindings switch-to-workspace-8 "['<Super>8']"
gsettings set org.gnome.desktop.wm.keybindings switch-to-workspace-9 "['<Super>9']"
gsettings set org.gnome.desktop.wm.keybindings switch-to-workspace-0 "['<Super>0']"

gsettings set org.gnome.desktop.wm.keybindings move-to-workspace-5 "['<Super><Shift>5']"
gsettings set org.gnome.desktop.wm.keybindings move-to-workspace-6 "['<Super><Shift>6']"
gsettings set org.gnome.desktop.wm.keybindings move-to-workspace-7 "['<Super><Shift>7']"
gsettings set org.gnome.desktop.wm.keybindings move-to-workspace-8 "['<Super><Shift>8']"
gsettings set org.gnome.desktop.wm.keybindings move-to-workspace-9 "['<Super><Shift>9']"
gsettings set org.gnome.desktop.wm.keybindings move-to-workspace-0 "['<Super><Shift>0']"

echo 'Install Jetbrains Toolbox'
wget https://www.jetbrains.com/toolbox-app/download/download-thanks.html?platform=linux
cd /opt/
sudo tar -xvzf ~/jetbrains*.tar.gz
sudo mv jetbrains-toolbox* jetbrains
jetbrains/jetbrains-toolbox
cd ~

echo 'Installing VSCode'
sudo apt-get install wget gpg
wget -qO- https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > packages.microsoft.gpg
sudo install -D -o root -g root -m 644 packages.microsoft.gpg /etc/apt/keyrings/packages.microsoft.gpg
sudo sh -c 'echo "deb [arch=amd64,arm64,armhf signed-by=/etc/apt/keyrings/packages.microsoft.gpg] https://packages.microsoft.com/repos/code stable main" > /etc/apt/sources.list.d/vscode.list'
rm -f packages.microsoft.gpg
sudo apt install apt-transport-https -y
sudo apt update && sudo apt install code -y

echo 'Installing Docker'
sudo apt install apt-transport-https ca-certificates curl software-properties-common -y
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu focal stable" -y
apt-cache policy docker-ce
sudo apt install docker-ce -y

sudo systemctl status docker
sudo groupadd docker
sudo usermod -aG docker $USER
sudo chmod 777 /var/run/docker.sock

echo 'Installing macOS ‘Quick Look’ on Ubuntu with GNOME Sushi'
sudo apt install gnome-sushi -y
