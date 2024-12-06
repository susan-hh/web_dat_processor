import sys
path = '/home/你的用户名/web_dat_processor'
if path not in sys.path:
    sys.path.append(path)

from app import app as application 