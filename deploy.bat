set host=edbutler@volger.cs.washington.edu
set webroot=/srv/www/ruthefjord
"C:\Program Files (x86)\Putty\plink.exe" %host% "rm -rf %webroot%/build"
"C:\Program Files (x86)\Putty\plink.exe" %host% "rm -rf %webroot%/latest"
"C:\Program Files (x86)\Putty\pscp.exe" -r build %host%:%webroot%/
"C:\Program Files (x86)\Putty\plink.exe" %host% "mv %webroot%/build %webroot%/latest"

