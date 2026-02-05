# Library AI Agent — Architecture & Integration 📚🤖

**Purpose:** This document explains how the project works conceptually, how the Flask backend is exposed to the internet (for integration with Watson Assistant) using a tunneling service like ngrok, and how Watson Assistant acts as the AI agent used by the web pages.

---

## Overview
This repository contains a Flask backend (`cloudant_client.py`) that manages library data (books, borrowings, users) and implements AI-parsing and business logic (the `smart_route` behavior). The frontend (React in `dashboard/`) uses Watson Assistant as the conversational AI agent; Watson Assistant calls the backend when it needs specialized logic (search, borrow, return, status, recommendations).

## How it works — high level flow 🔁
1. A user interacts with the web UI (a page that hosts or talks to Watson Assistant).
2. Watson Assistant receives the user input and, based on its dialog/Action configuration, may call an external webhook (the Flask app) to perform domain-specific logic.
3. The webhook (Flask) receives a JSON request, runs NLP and business logic (e.g., `nlp_parse_text`, database queries against IBM Cloudant), and responds in a JSON format Watson can consume.
4. Watson Assistant uses the webhook response to formulate the conversational reply or update its session context, and the UI displays the final message to the user.

This pattern lets Watson remain the front-line conversational engine while delegating domain operations and authoritative state changes to the Flask backend.

## Exposing the Flask backend to Watson Assistant (ngrok / tunneling) 🌐
- Watson Assistant requires an HTTPS-accessible webhook URL. When developing locally, a tunneling service such as ngrok provides a secure public HTTPS URL that forwards to your local Flask port (usually 5000).
- Typical flow: run a tunnel that maps https://<uniq>.ngrok.io -> http://localhost:5000. Configure this ngrok HTTPS URL as the webhook endpoint inside Watson Assistant (Actions or Dialog webhook config).
- Important considerations:
  - ngrok free-tier URLs are ephemeral (they change each session). If you rely on a fixed webhook in Watson, use a stable or reserved domain (paid ngrok feature) or update the webhook whenever the ngrok URL changes.
  - Always use the HTTPS ngrok URL (Watson requires secure endpoints).
  - Protect the webhook using a shared secret or token header so Watson webhooks are authenticated by your Flask app.

## Webhook contract — request & response (conceptual)
- Watson will POST JSON to your webhook. The exact shape depends on how you configure the Action/skill webhook, but a recommended adapter contract for this project is:

  Example request (adapter-friendly):
  {
    "text": "I want to borrow The Hobbit",
    "student_id": "stu123",
    "context": { /* any Watson context if forwarded */ }
  }

- Example response expected by Watson (simple):
  {
    "message": "Book borrowed: The Hobbit.",
    "status": "ok",
    "items": [ /* optional */ ],
    "context_updates": { /* optional context updates for Watson */ }
  }

- If Watson's native webhook format differs, build a small adapter endpoint (e.g., `/watson_webhook`) in Flask that translates Watson's format into the internal `smart_route` payload and vice versa.

## Watson Assistant configuration (conceptual) 🧭
- Create Actions or Dialog nodes that call an external webhook when a backend operation is needed (e.g., when intent = borrow).
- Map relevant user input and session context into the webhook request payload.
- Map the webhook response into output text, UI cards, or updates to session context.
- In the Watson Assistant UI you can test webhook calls and inspect responses — this pairs well with ngrok's request inspector while developing.

## Frontend integration (pages use Watson Assistant) 🖥️
- The web pages integrate Watson Assistant either via a hosted web chat widget or by calling Watson Assistant APIs directly.
- The frontend usually does not call the Flask backend directly for AI conversational flows — Watson Assistant is the intermediary that routes conversational traffic to Flask (via webhook) and returns responses to the UI.
- For non-conversational UI features (e.g., fetching a list of books to render a table), the frontend may call the Flask REST endpoints directly (the project already includes endpoints like `/available_books`, `/check_book`, etc.).

## Technical details & environment (overview)
- The backend communicates with IBM Cloudant for persistence (databases observed: `library_books`, `borrowings`, `users`).
- The code contains AI parsing logic (e.g., `nlp_parse_text`) which can use Google GenAI or fallback to Hugging Face inference.
- To integrate with Watson Assistant, the primary interface is the webhook endpoint that accepts Watson requests and returns JSON responses Watson can use.

## Security & Best practices 🔐
- Use HTTPS (ngrok provides this during local development). For production, use a real, trusted HTTPS endpoint.
- Protect webhooks: require a shared secret token in an HTTP header and validate on the Flask side before processing requests.
- Make webhook URLs stable for production (avoid ephemeral tunnel URLs) or automate webhook updates when tunneling domains rotate.
- Keep secrets out of source control and use secure secret management for credentials.

## Debugging & testing tips 🐞
- Use ngrok's web inspector to view incoming webhook requests and responses in real time.
- Use Watson Assistant's built-in test console to simulate user input and verify webhook behavior.
- Add verbose logging in Flask for webhook endpoints during development so you can trace payloads and responses.

---
