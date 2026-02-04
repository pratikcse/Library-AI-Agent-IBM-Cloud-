from flask import Flask, request, jsonify
from flask_cors import CORS
from ibmcloudant.cloudant_v1 import CloudantV1
from ibm_cloud_sdk_core.authenticators import IAMAuthenticator
from datetime import datetime, timedelta
import os
import json
import requests
import time
from google import genai


API_KEY = "FQH_JxONQnwAqfIRIQW4YGuKXft3lDclyLG05DHhGqMT"
CLOUDANT_URL = "https://0c3af5f2-8e5c-4807-9e5b-5b8974f7cd4a-bluemix.cloudantnosqldb.appdomain.cloud"

BOOK_DB = "library_books"
TXN_DB = "borrowings"
STUDENT_DB = "users"

authenticator = IAMAuthenticator(API_KEY)
cloudant = CloudantV1(authenticator=authenticator)
cloudant.set_service_url(CLOUDANT_URL)

app = Flask(__name__)
# allow requests from the React dev server
CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}})

def ensure_db(db_name):
    if db_name not in cloudant.get_all_dbs().get_result():
        cloudant.put_database(db=db_name)

ensure_db(BOOK_DB)
ensure_db(TXN_DB)
ensure_db(STUDENT_DB)



_genai_key = os.environ.get("GOOGLE_GENAI_API_KEY")
if _genai_key:
    client = genai.Client(api_key=_genai_key)
else:
    client = None
    print("Warning: GOOGLE_GENAI_API_KEY not set — GenAI calls will be skipped or may error if required.")


def _parse_json_from_text(text):
    try:
        return json.loads(text)
    except Exception:
        start = text.find('{')
        end = text.rfind('}')
        if start != -1 and end != -1 and end > start:
            try:
                return json.loads(text[start:end+1])
            except Exception:
                return None
        return None


def _huggingface_inference(prompt):
    # Read token from environment (do NOT hardcode tokens)
    hf_token = ""
    preferred_model = os.environ.get("HF_MODEL", "mistralai/Mistral-7B-Instruct-v0.3")

    # Build candidate list
    candidates = [preferred_model]
    if preferred_model.endswith("/Mistral-7B-Instruct") or preferred_model.endswith("Mistral-7B-Instruct"):
        candidates += [preferred_model + suffix for suffix in ["-v0.3", "-v0.2", "-v0.1"]]
    candidates += ["bigscience/bloomz-1b1", "tiiuae/falcon-7b-instruct"]

    if not hf_token:
        print("Hugging Face API key not found in HUGGINGFACE_API_KEY")
        return None

    router_url = "https://router.huggingface.co/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {hf_token}",
        "Content-Type": "application/json"
    }

    for model in candidates:
        payload = {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "stream": False
        }

        backoff = 1.0
        for attempt in range(3):
            try:
                r = requests.post(router_url, headers=headers, json=payload, timeout=30)

                if r.status_code == 200:
                    data = r.json()
                    if isinstance(data, dict) and "choices" in data and len(data["choices"]) > 0:
                        choice = data["choices"][0]
                        if isinstance(choice.get("message"), dict):
                            return choice["message"].get("content") or json.dumps(choice["message"])
                        if "text" in choice:
                            return choice.get("text")
                    if isinstance(data, dict) and "generated_text" in data:
                        return data["generated_text"]
                    return r.text

                # Model does not exist: move to next candidate
                if r.status_code == 400:
                    try:
                        j = r.json()
                        msg = json.dumps(j)
                    except Exception:
                        msg = r.text
                    if "does not exist" in msg or ("model" in msg and "not" in msg):
                        print(f"Model not found: {model}; trying next candidate")
                        break

                # Transient errors -> retry
                if r.status_code in (429, 502, 503, 504):
                    print(f"Transient HF error {r.status_code} for model {model}; retrying in {backoff}s")
                    time.sleep(backoff)
                    backoff = min(backoff * 2, 8)
                    continue

                print("HF inference error", r.status_code, r.text)
                break

            except Exception as e:
                print("HF inference exception on attempt", attempt + 1, "for model", model, e)
                time.sleep(backoff)
                backoff = min(backoff * 2, 8)
                continue

    print("All Hugging Face model candidates failed or are unavailable.")
    return None



def nlp_parse_text(user_text):
    """Attempt GenAI first, then Hugging Face inference fallback."""
    if not user_text:
        return {"intent": "unknown"}

    prompt = f"""
You are a library AI agent.

User message:
"{user_text}"

Decide the user's intent and extract details.

Possible intents:
- borrow
- return
- status
- recommend
- list
- search
- check
- unknown

Return ONLY valid JSON:
{{
  "intent": "borrow|return|status|recommend|list|search|check|unknown",
  "title": "book title or null",
  "subject": "subject or null",
  "tag": "tag or null"
}}
"""

    # Try Google GenAI first (handle quota and retry info gracefully)
    if client:
        try:
            response = client.models.generate_content(
                model=os.environ.get("GOOGLE_GENAI_MODEL", "gemini-2.5-pro"),
                contents=prompt
            )
            text = getattr(response, "text", None) or getattr(response, "content", None) or str(response)
            parsed = _parse_json_from_text(text or "")
            if parsed:
                return parsed
        except Exception as e:
            err_str = str(e)
            print("GenAI call failed:", err_str)
            # If quota exhausted or 429, do NOT block; fall back to Hugging Face immediately
            if "RESOURCE_EXHAUSTED" in err_str or "429" in err_str or "quota" in err_str.lower():
                print("GenAI quota exhausted or rate-limited; falling back to Hugging Face")
            else:
                print("GenAI error encountered; falling back to Hugging Face")
    else:
        print("Skipping GenAI: GOOGLE_GENAI_API_KEY not configured; using Hugging Face fallback")

    # Fallback to Hugging Face Inference API (requires HUGGINGFACE_API_KEY env var)
    hf_text = _huggingface_inference(prompt)
    if hf_text:
        parsed = _parse_json_from_text(hf_text)
        if parsed:
            return parsed

    return {"intent": "unknown"}


def nlp_fallback_internal(user_text):
    if not user_text:
        return {"intent": "unknown"}

    prompt = f"""
You are a library AI agent.

User message:
"{user_text}"

Decide the user's intent and extract details.

Possible intents:
- borrow
- return
- status
- recommend
- list
- search
- check
- unknown

Return ONLY valid JSON:
{{
  "intent": "borrow|return|status|recommend|list|search|check|unknown",
  "title": "book title or null",
  "subject": "subject or null",
  "tag": "tag or null"
}}
"""

    response = client.models.generate_content(
        model="gemini-2.5-pro",
        contents=prompt
    )

    try:
        return json.loads(response.text)
    except:
        return {"intent": "unknown"}



@app.route("/smart_route", methods=["POST"])
def smart_route():
    user_text = request.json.get("text")
    student_id = request.json.get("student_id")

    if not user_text or not student_id:
        return jsonify({
            "message": "text and student_id required"
        }), 400

    nlp = nlp_parse_text(user_text)

    intent = nlp.get("intent")

    # ---- BORROW BOOK ----
    if intent == "borrow":
        return jsonify(
            lend_by_title_internal(
                nlp.get("title"),
                student_id
            )
        )

    # ---- RETURN BOOK (STEP 1: SHOW ACTIVE BORROWS) ----
    if intent == "return":
        borrows = active_borrows_internal(student_id)

        if borrows["count"] == 0:
            return jsonify({
                "message": "You have no books to return."
            })

        return jsonify({
            "message": "Which book do you want to return?\n" + borrows["summary"],
            "items": borrows["items"]
        })

    # ---- STATUS ----
    if intent == "status":
        return jsonify(
            student_status_internal(student_id)
        )

    # ---- RECOMMEND ----
    if intent == "recommend":
        return jsonify(
            recommend_books_internal(
                nlp.get("subject")
            )
        )

    # ---- LIST AVAILABLE BOOKS ----
    if intent == "list":
        return jsonify(
            available_books_internal()
        )

    # ---- SEARCH ----
    if intent == "search":
        return jsonify(
            search_books_internal(
                nlp.get("subject"),
                nlp.get("tag")
            )
        )

    # ---- CHECK AVAILABILITY ----
    if intent == "check":
        return jsonify(
            check_book_internal(
                nlp.get("subject")
            )
        )

    # ---- FALLBACK ----
    return jsonify({
        "message": "Sorry, I couldn't understand your request."
    })



def check_book_internal(subject):
    if not subject:
        return {
            "available": False,
            "message": "Subject not provided"
        }

    response = cloudant.post_find(
        db=BOOK_DB,
        selector={"subject": subject}
    ).get_result()

    books = response.get("docs", [])

    available = any(
        book.get("available_copies", 0) > 0
        for book in books
    )

    return {
        "subject": subject,
        "available": available
    }

@app.route("/check_book", methods=["POST"])
def check_book():
    subject = request.json.get("subject")
    data = check_book_internal(subject)
    return jsonify(data)


def available_books_internal():
    response = cloudant.post_find(
        db=BOOK_DB,
        selector={
            "available_copies": {"$gt": 0}
        }
    ).get_result()

    books = response.get("docs", [])

    result = []

    for book in books:
        result.append({
            "book_id": book["_id"],
            "title": book["title"],
            "author": book["author"],
            "subject": book["subject"],
            "tags": book.get("tags", []),
            "available_copies": book["available_copies"],
            "total_copies": book.get(
                "total_copies", book["available_copies"]
            )
        })

    return {
        "count": len(result),
        "books": result
    }

@app.route("/available_books", methods=["GET"])
def available_books():
    data = available_books_internal()
    return jsonify(data)



def login_internal(student_id):
    if not student_id:
        return {
            "success": False,
            "message": "student_id required"
        }

    try:
        student = cloudant.get_document(
            db=STUDENT_DB,
            doc_id=student_id
        ).get_result()
    except:
        return {
            "success": False,
            "message": "Invalid student ID"
        }

    return {
        "success": True,
        "status": "authenticated",
        "student_id": student["_id"],
        "name": student["name"],
        "branch": student["branch"]
    }

@app.route("/login", methods=["POST"])
def login():
    student_id = request.json.get("student_id")
    data = login_internal(student_id)

    status_code = 200 if data.get("success") else 400
    return jsonify(data), status_code



def recommend_books_internal(subject):
    if not subject:
        return "❌ Subject not provided."

    response = cloudant.post_find(
        db=BOOK_DB,
        selector={"subject": subject}
    ).get_result()

    books = response.get("docs", [])

    if not books:
        return f"📚 No books found for {subject}."

    ranked = sorted(
        books,
        key=lambda b: b.get("available_copies", 0),
        reverse=True
    )[:3]

    lines = [f"📘 Top recommended books for {subject}:\n"]

    for idx, book in enumerate(ranked, start=1):
        tags = ", ".join(book.get("tags", []))
        lines.append(
            f"{idx}. {book['title']} by {book['author']}\n"
            f"   Available copies: {book['available_copies']}\n"
            f"   Topics: {tags}\n"
        )

    return "\n".join(lines)


@app.route("/recommend_books", methods=["POST"])
def recommend_books():
    subject = request.json.get("subject")
    message = recommend_books_internal(subject)
    return jsonify({
        "message": message
    })



def lend_by_title_internal(title, student_id):
    if not title or not student_id:
        return {
            "success": False,
            "message": "title and student_id required"
        }

    title = title.lower()

    response = cloudant.post_find(
        db=BOOK_DB,
        selector={}
    ).get_result()

    books = response.get("docs", [])

    matched = None
    for book in books:
        if title in book.get("title", "").lower():
            matched = book
            break

    if not matched:
        return {
            "success": False,
            "message": "Book not found"
        }

    if matched.get("available_copies", 0) <= 0:
        return {
            "success": False,
            "message": "No copies available"
        }

    student = cloudant.get_document(
        db=STUDENT_DB,
        doc_id=student_id
    ).get_result()

    if len(student.get("active_borrowings", [])) >= student.get("borrow_limit", 0):
        return {
            "success": False,
            "message": "Borrow limit reached"
        }

    txn_id = f"txn_{datetime.utcnow().timestamp()}"

    txn = {
        "_id": txn_id,
        "book_id": matched["_id"],
        "user_id": student_id,
        "borrowed_on": datetime.utcnow().strftime("%Y-%m-%d"),
        "due_date": (datetime.utcnow() + timedelta(days=14)).strftime("%Y-%m-%d"),
        "returned": False
    }

    cloudant.post_document(db=TXN_DB, document=txn)

    matched["available_copies"] -= 1
    cloudant.put_document(
        db=BOOK_DB,
        doc_id=matched["_id"],
        document=matched
    )

    student["active_borrowings"].append(txn_id)
    cloudant.put_document(
        db=STUDENT_DB,
        doc_id=student_id,
        document=student
    )

    return {
        "success": True,
        "title": matched["title"],
        "transaction_id": txn_id,
        "message": f"📘 {matched['title']} has been issued successfully."
    }

@app.route("/lend_by_title", methods=["POST"])
def lend_by_title():
    title = request.json.get("title")
    student_id = request.json.get("student_id")

    data = lend_by_title_internal(title, student_id)
    status_code = 200 if data.get("success") else 400

    return jsonify(data), status_code


def active_borrows_internal(student_id):
    if not student_id:
        return {
            "count": 0,
            "items": [],
            "summary": "student_id not provided"
        }

    student = cloudant.get_document(
        db=STUDENT_DB,
        doc_id=student_id
    ).get_result()

    result = []

    for txn_id in student.get("active_borrowings", []):
        txn = cloudant.get_document(
            db=TXN_DB,
            doc_id=txn_id
        ).get_result()

        if txn.get("returned"):
            continue

        book = cloudant.get_document(
            db=BOOK_DB,
            doc_id=txn["book_id"]
        ).get_result()

        result.append({
            "index": len(result) + 1,
            "transaction_id": txn_id,
            "title": book["title"],
            "due_date": txn["due_date"]
        })

    summary = (
        "✅ You have no active borrowings."
        if not result
        else "📚 Your active borrowed books:\n\n" + "\n\n".join(
            [
                f"• {item['title']}\n"
                f"  Due: {item['due_date']}\n"
                f"  Transaction ID: {item['transaction_id']}"
                for item in result
            ]
        )
    )


    return {
        "count": len(result),
        "summary": summary,
        "items": result
    }

@app.route("/active_borrows", methods=["POST"])
def active_borrows():
    student_id = request.json.get("student_id")
    data = active_borrows_internal(student_id)
    return jsonify(data)



def return_book_internal(transaction_id):
    if not transaction_id:
        return {
            "success": False,
            "message": "transaction_id required"
        }

    txn = cloudant.get_document(
        db=TXN_DB,
        doc_id=transaction_id
    ).get_result()

    if txn.get("returned"):
        return {
            "success": False,
            "message": "Book already returned"
        }

    book = cloudant.get_document(
        db=BOOK_DB,
        doc_id=txn["book_id"]
    ).get_result()

    student = cloudant.get_document(
        db=STUDENT_DB,
        doc_id=txn["user_id"]
    ).get_result()

    # Mark transaction returned
    txn["returned"] = True
    cloudant.put_document(
        db=TXN_DB,
        doc_id=transaction_id,
        document=txn
    )

    # Increase available copies
    book["available_copies"] += 1
    cloudant.put_document(
        db=BOOK_DB,
        doc_id=book["_id"],
        document=book
    )

    # Remove from student's active borrowings
    if transaction_id in student.get("active_borrowings", []):
        student["active_borrowings"].remove(transaction_id)

    cloudant.put_document(
        db=STUDENT_DB,
        doc_id=student["_id"],
        document=student
    )

    return {
        "success": True,
        "message": f"📘 {book['title']} has been returned successfully."
    }

@app.route("/return_book", methods=["POST"])
def return_book():
    transaction_id = request.json.get("transaction_id")
    data = return_book_internal(transaction_id)

    status_code = 200 if data.get("success") else 400
    return jsonify(data), status_code


def student_status_internal(student_id):
    if not student_id:
        return {
            "success": False,
            "message": "student_id required"
        }

    student = cloudant.get_document(
        db=STUDENT_DB,
        doc_id=student_id
    ).get_result()

    borrowed_details = []

    for txn_id in student.get("active_borrowings", []):
        txn = cloudant.get_document(
            db=TXN_DB,
            doc_id=txn_id
        ).get_result()

        if txn.get("returned"):
            continue

        book = cloudant.get_document(
            db=BOOK_DB,
            doc_id=txn["book_id"]
        ).get_result()

        borrowed_details.append({
            "transaction_id": txn_id,
            "book_id": book["_id"],
            "title": book["title"],
            "author": book["author"],
            "borrowed_on": txn["borrowed_on"],
            "due_date": txn["due_date"]
        })

    summary_lines = [
        f"📘 {item['title']} (Due: {item['due_date']})"
        for item in borrowed_details
    ]

    summary_text = (
        "No active borrowings."
        if not summary_lines
        else "\n".join(summary_lines)
    )

    return {
        "success": True,
        "student_id": student["_id"],
        "name": student["name"],
        "branch": student["branch"],
        "borrow_limit": student["borrow_limit"],
        "borrowed_count": len(borrowed_details),
        "borrowed_summary": summary_text,
        "currently_borrowed": borrowed_details
    }

@app.route("/student_status", methods=["POST"])
def student_status():
    student_id = request.json.get("student_id")
    data = student_status_internal(student_id)

    status_code = 200 if data.get("success") else 400
    return jsonify(data), status_code



def search_books_internal(subject, tag=None):
    if not subject:
        return {
            "success": False,
            "message": "subject required",
            "count": 0,
            "books": []
        }

    response = cloudant.post_find(
        db=BOOK_DB,
        selector={"subject": subject}
    ).get_result()

    books = response.get("docs", [])

    if tag:
        tag_lower = tag.lower()
        books = [
            book for book in books
            if tag_lower in [t.lower() for t in book.get("tags", [])]
        ]

    return {
        "success": True,
        "count": len(books),
        "books": books
    }

@app.route("/search_books", methods=["POST"])
def search_books():
    subject = request.json.get("subject")
    tag = request.json.get("tag")

    data = search_books_internal(subject, tag)
    status_code = 200 if data.get("success") else 400

    return jsonify(data), status_code





FINE_PER_DAY = 5

@app.route("/overdue_status", methods=["POST"])
def overdue_status():
    student_id = request.json.get("student_id")

    if not student_id:
        return jsonify({"error": "student_id required"}), 400

    student = cloudant.get_document(
        db=STUDENT_DB,
        doc_id=student_id
    ).get_result()

    today = datetime.utcnow().date()
    overdue_list = []
    total_fine = 0

    for txn_id in student.get("active_borrowings", []):
        txn = cloudant.get_document(
            db=TXN_DB,
            doc_id=txn_id
        ).get_result()

        if txn["returned"]:
            continue

        due_date = datetime.strptime(
            txn["due_date"], "%Y-%m-%d"
        ).date()

        if due_date < today:
            days_late = (today - due_date).days
            fine = days_late * FINE_PER_DAY

            book = cloudant.get_document(
                db=BOOK_DB,
                doc_id=txn["book_id"]
            ).get_result()

            overdue_list.append({
                "transaction_id": txn_id,
                "book_id": book["_id"],
                "title": book["title"],
                "due_date": txn["due_date"],
                "days_late": days_late,
                "fine": fine
            })

            total_fine += fine

    return jsonify({
        "student_id": student_id,
        "student_name": student["name"],
        "overdue_books": overdue_list,
        "total_fine": total_fine
    })


@app.route("/", methods=["GET"])
def home():
    return jsonify({"status": "Library backend running"})

if __name__ == "__main__":
    app.run(port=5000, debug=True)
