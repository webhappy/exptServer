import subprocess
subprocess.call('./mysql2sqlite.sh --password=mysql_password CRISPR sgRNAs comparisons tickers | sqlite3 local.db',shell=True)