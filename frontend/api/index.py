from flask import Flask, jsonify, request

app = Flask(__name__)

@app.route('/', methods=['GET'])
def health_check():
    return jsonify({"status": "backend is running"})


# Temporary endpoint to log bid and tender data
@app.route('/evaluate_bids', methods=['POST'])
def evaluate_bids():
    try:
        data = request.json  # Receive bid data from Next.js

        # Log the tender details
        tender_details = data["tenderDetails"]
        print("Tender Details:")
        print(tender_details)

        # Log each bid
        print("Bids:")
        for bid in data["bids"]:
            print(bid)

        # Return a success response
        return jsonify({"status": "success", "message": "Data received and logged successfully"})

    except Exception as e:
        # Return an error response if something goes wrong
        return jsonify({"status": "error", "message": str(e)})


if __name__ == '__main__':
    app.run(debug=True)