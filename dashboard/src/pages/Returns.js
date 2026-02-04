import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { getActiveBorrows, returnBook } from "../services/api";
import "./Returns.css";

function Returns() {
  const { user } = useAuth();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [returning, setReturning] = useState(null);
  const [message, setMessage] = useState(null);

  const fetchBooks = async () => {
    if (!user?.studentId) return;

    try {
      const result = await getActiveBorrows(user.studentId);

      if (result.success) {
        setBooks(result.data.items || []);
      }
    } catch (err) {
      console.error("Failed to load books");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, [user]);

  const handleReturn = async (transactionId, title) => {
    setReturning(transactionId);
    setMessage(null);

    try {
      const result = await returnBook(transactionId);

      if (result.success) {
        setMessage({ type: "success", text: `✅ "${title}" returned successfully!` });
        // Refresh the list
        await fetchBooks();
      } else {
        setMessage({ type: "error", text: result.data?.message || "Failed to return book" });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Connection error" });
    } finally {
      setReturning(null);
    }
  };

  if (loading) {
    return (
      <div className="returns-page">
        <h2>📤 Return Books</h2>
        <p className="loading-text">Loading your books...</p>
      </div>
    );
  }

  return (
    <div className="returns-page">
      <h2>📤 Return Books</h2>

      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      {books.length === 0 ? (
        <p className="empty-text">You have no books to return.</p>
      ) : (
        <div className="returns-list">
          {books.map((book) => (
            <div key={book.transaction_id} className="return-card">
              <div className="book-info">
                <h3>{book.title}</h3>
                <p><strong>Due Date:</strong> {book.due_date}</p>
              </div>
              <button
                className="return-btn"
                onClick={() => handleReturn(book.transaction_id, book.title)}
                disabled={returning === book.transaction_id}
              >
                {returning === book.transaction_id ? "Returning..." : "Return"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Returns;
