from flask import Flask, send_from_directory
import os

app = Flask(__name__, static_folder='.')

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(app.static_folder + '/' + path):
        return send_from_directory(app.static_folder, path)
    else:
        if path.endswith('/') or path == "":
            target_path = os.path.join(path, 'index.html').strip('/')
            if os.path.exists(os.path.join(app.static_folder, target_path)):
                return send_from_directory(app.static_folder, target_path)
        return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port)
