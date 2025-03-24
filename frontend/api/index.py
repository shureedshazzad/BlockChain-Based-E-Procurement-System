from flask import Flask, jsonify, request
import numpy as np
from datetime import datetime


app = Flask(__name__)

@app.route('/', methods=['GET'])
def health_check():
    return jsonify({"status": "backend is running"})



# Define scoring rules for qualitative criteria
QUALITATIVE_SCORES = {
    'safety': {
        # Keywords mapped to scores (scale: 1-10)
        'osha': 6,
        'iso 45001': 8,
        'ansi': 5,
        'compliant': 4,
        'certified': 7,
        'basic': 3,
        'zero accidents': 9,
        'safety award': 10
    },
    'material': {
        'high-grade': 8,
        'eco-friendly': 7,
        'premium': 9,
        'standard': 5,
        'recycled': 6,
        'imported': 7,
        'sustainable': 8,
        'certified': 7
    },
    'environment': {
        'leed gold': 9,
        'carbon-neutral': 8,
        'sustainable': 7,
        'energy-efficient': 6,
        'green': 5,
        'compliant': 4,
        'zero waste': 9,
        'climate positive': 10
    }
}

def text_to_score(text, criterion_type):
      """Convert descriptive text to numerical score using keyword matching"""
      if not isinstance(text, str):
          return 3  # Default neutral score for missing/non-string values
      text = text.lower()
      max_score = 0
      # Search for all matching keywords and take the highest score
      for keyword, score in QUALITATIVE_SCORES[criterion_type].items():
          if keyword in text and score > max_score:
               max_score = score
      # Default score if no keywords matched
      return max_score if max_score > 0 else 3  # Neutral default score



def calculate_duration(start_date, end_date):
    """Calculate duration in days between two dates"""
    fmt = "%Y-%m-%dT%H:%M"
    start = datetime.strptime(start_date, fmt)
    end = datetime.strptime(end_date, fmt)
    return (end - start).days

def fuzzy_moora_evaluation(bids, tender_details):
    """
      Here fuzzy logic is calculated based on experinece,budget,workforce,duration,safety standard,material quality,environmental impact
    """
    # Define all evaluation criteria with weights and properties
    criteria = {
        'cost' : {
            'type': 'quantitative',
            'weight': 0.25,
            'beneficial': False,  # Lower is better
            'default': float(tender_details.get('budget', 1000000))
        },
        'experience' : {
            'type': 'quantitative',
            'weight': 0.20,
            'beneficial': True,  # Higher is better
            'default': float(tender_details.get('requiredExperience', 5))
        },
        'workforce' : {
            'type': 'quantitative',
            'weight': 0.15,
            'beneficial': True,  #Higher is better
            'default': float(tender_details.get('workforceSize', 10))
        },
        'timeline' : {
            'type': 'quantitative',
            'weight': 0.10,
            'beneficial': False,
            'default': float(tender_details.get('completionDeadline', 365))
        },
        'safety' : {
            'type': 'qualitative',
            'weight': 0.15,
            'beneficial': True,
            'default': tender_details.get('safetyStandards', 'basic').lower()
        },
        'material': {
            'type': 'qualitative',
            'weight': 0.10,
            'beneficial': True,
            'default': tender_details.get('materialQuality', 'standard').lower()
        },
        'environment': {
            'type': 'qualitative',
            'weight': 0.05,
            'beneficial': True,
            'default': tender_details.get('environmentalImpact', 'compliant').lower()
        }
    }

    # Prepare decision matrix
    decision_matrix = []
    valid_bids = []

    for bid in bids:
        try:
            row = []
            bid_data = {
                'bidder': bid['bidder'],
                'companyName': bid['companyName'],
                'details': {}
            }
            # Process quantitative criteria
            row.append(float(bid['budget']))
            bid_data['details']['budget'] = float(bid['budget'])

            row.append(float(bid['requiredExperience']))
            bid_data['details']['experience'] = float(bid['requiredExperience'])

            row.append(float(bid['workforceSize']))
            bid_data['details']['workforce'] = float(bid['workforceSize'])

            duration = calculate_duration(bid['projectStartTime'], bid['projectEndTime'])
            row.append(duration)
            bid_data['details']['timeline'] = f"{duration} days"

            # Process qualitative criteria with text-to-score conversion
            safety_text = bid.get('safetyStandards', criteria['safety']['default'])
            safety_score = text_to_score(safety_text, 'safety')
            row.append(safety_score)
            bid_data['details']['safetyStandards'] = {
                'description': safety_text,
                'score': safety_score
            }

            material_text = bid.get('materialQuality', criteria['material']['default'])
            material_score = text_to_score(material_text, 'material')
            row.append(material_score)
            bid_data['details']['materialQuality'] = {
                'description': material_text,
                'score': material_score
            }

            environment_text = bid.get('environmentalImpact', criteria['environment']['default'])
            environment_score = text_to_score(environment_text, 'environment')
            row.append(environment_score)
            bid_data['details']['environmentalImpact'] = {
                'description': environment_text,
                'score': environment_score
            }

            decision_matrix.append(row)
            valid_bids.append(bid_data)
        except (KeyError, ValueError, TypeError) as e:
            print(f"Skipping invalid bid: {e}")
            continue
    
    if not decision_matrix:
        raise ValueError("No valid bids to evaluate")
    

    matrix = np.array(decision_matrix)

    #normalization
    norm_matrix = np.zeros_like(matrix, dtype=float)
    for j in range(matrix.shape[1]):
         criterion = list(criteria.values())[j]
         if criterion['beneficial']:
             norm_matrix[:, j] = matrix[:, j] / np.max(matrix[:, j])
         else:
             norm_matrix[:, j] = np.min(matrix[:, j]) / matrix[:, j]
    
    # Apply weights
    weights = np.array([c['weight'] for c in criteria.values()])
    weighted_matrix = norm_matrix * weights

    # Calculate scores
    beneficial_indices = [i for i, c in enumerate(criteria.values()) if c['beneficial']]
    non_beneficial_indices = [i for i, c in enumerate(criteria.values()) if not c['beneficial']]

    beneficial = weighted_matrix[:, beneficial_indices].sum(axis=1)
    non_beneficial = weighted_matrix[:, non_beneficial_indices].sum(axis=1)
    final_scores = beneficial - non_beneficial


    # Rank bids
    ranked_indices = np.argsort(final_scores)[::-1]

    # Prepare results
    results = []
    for i, idx in enumerate(ranked_indices, 1):
        result = {
            "rank": i,
            "bidder": valid_bids[idx]['bidder'],
            "companyName": valid_bids[idx]['companyName'],
            "score": round(float(final_scores[idx]), 4),
            "details": valid_bids[idx]['details']
        }
        results.append(result)
    return results
    

# Temporary endpoint to log bid and tender data
@app.route('/evaluate_bids', methods=['POST'])
def evaluate_bids():
    try:
        data = request.json
        # Validate input
        if not data or 'tenderDetails' not in data or 'bids' not in data:
            return jsonify({"status": "error", "message": "Invalid request format"})

        tender = data["tenderDetails"]
        bids = data["bids"]

        if not isinstance(bids, list) or len(bids) == 0:
            return jsonify({"status": "error", "message": "No bids provided"})
        # Perform Fuzzy MOORA evaluation
        evaluation_results = fuzzy_moora_evaluation(bids, tender)

        return jsonify({
            "status": "success",
            "evaluation_method": "Enhanced Fuzzy MOORA",
            "criteria_weights": {name: c['weight'] for name, c in {
                'cost': {'weight': 0.25},
                'experience': {'weight': 0.20},
                'workforce': {'weight': 0.15},
                'timeline': {'weight': 0.10},
                'safety': {'weight': 0.15},
                'material': {'weight': 0.10},
                'environment': {'weight': 0.05}
            }.items()},
            "winner": evaluation_results[0] if evaluation_results else None,
            "all_results": evaluation_results
        })

    except ValueError as e:
        return jsonify({"status": "error", "message": str(e)})
    except Exception as e:
        return jsonify({"status": "error", "message": f"Evaluation failed: {str(e)}"})


if __name__ == '__main__':
    app.run(debug=True)