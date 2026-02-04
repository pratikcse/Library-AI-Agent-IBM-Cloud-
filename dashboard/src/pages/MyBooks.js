import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { getActiveBorrows } from "../services/api";
import "./MyBooks.css";

function MyBooks() {
  const { user } = useAuth();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchBooks() {
      if (!user?.studentId) return;

      try {
        const result = await getActiveBorrows(user.studentId);

        if (result.success) {
          setBooks(result.data.items || []);
        } else {
          setError("Failed to load books");
        }
      } catch (err) {
        setError("Connection error");
      } finally {
        setLoading(false);
      }
    }

    fetchBooks();
  }, [user]);

  if (loading) {
    return (
      <div className="mybooks-page">
        <h2>📚 My Books</h2>
        <p className="loading-text">Loading your books...</p>
      </div>
    );
  }

  return (
    <div className="mybooks-page">
      <h2>📚 My Books</h2>

      {error && <p className="error-text">{error}</p>}

      {books.length === 0 ? (
        <p className="empty-text">You haven't borrowed any books yet.</p>
      ) : (
        <div className="books-list">
          {books.map((book, index) => (
            <div key={book.transaction_id || index} className="book-card">
              <div className="book-info">
                <h3>{book.title}</h3>
                <p><strong>Due Date:</strong> {book.due_date}</p>
                <p className="txn-id">Transaction: {book.transaction_id}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MyBooks;
