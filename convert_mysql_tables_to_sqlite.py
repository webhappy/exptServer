import subprocess
subprocess.call('./mysql2sqlite.sh --password=mysql_password CSPR sgRNAs comparisons tickers | sqlite3 local.db',shell=True)