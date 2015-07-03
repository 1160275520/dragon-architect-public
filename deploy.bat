if "%1"=="" (
    echo "Usage: deploy.bat <destination name>"
    goto DONE
)

set host=edbutler@gigantor.cs.washington.edu
set webroot=/srv/www/dragonarchitect
"C:\Program Files (x86)\Putty\plink.exe" %host% "rm -rf %webroot%/dist"
"C:\Program Files (x86)\Putty\pscp.exe" -r dist %host%:%webroot%/
"C:\Program Files (x86)\Putty\plink.exe" %host% "rm -rf %webroot%/%1"
"C:\Program Files (x86)\Putty\plink.exe" %host% "mv %webroot%/dist %webroot%/%1"

:DONE

