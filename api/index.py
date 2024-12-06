from flask import Flask, send_from_directory
from app import app as flask_app
import os

app = flask_app

@app.route('/favicon.ico')
def favicon():
    return send_from_directory(
        os.path.join(app.root_path, 'static'),
        'favicon.ico', 
        mimetype='image/vnd.microsoft.icon'
    )

@app.route('/api/healthcheck')
def healthcheck():
    return {"status": "ok"}