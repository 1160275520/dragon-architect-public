"C:\Program Files (x86)\Putty\plink.exe" edbutler@games.cs.washington.edu "rm -rf /var/www/hackcraft/build"
"C:\Program Files (x86)\Putty\plink.exe" edbutler@games.cs.washington.edu "rm -rf /var/www/hackcraft/latest"
"C:\Program Files (x86)\Putty\pscp.exe" -r build edbutler@games.cs.washington.edu:/var/www/hackcraft/
"C:\Program Files (x86)\Putty\plink.exe" edbutler@games.cs.washington.edu "mv /var/www/hackcraft/build /var/www/hackcraft/latest"

