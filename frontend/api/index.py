from flask import Flask, jsonify


app = Flask(__name__)

@app.route('/', methods=['GET'])
def health_check():
    return jsonify({"status": "backend is running"})

if __name__ == '__main__':
    app.run(debug=True)