import React, { useEffect, useState } from "react";
import { getAvailableBooks, lendByTitle } from "../services/api";
import { useAuth } from "../context/AuthContext";
import "./AllBooks.css";

function AllBooks() {
  const { user } = useAuth();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [issuing, setIssuing] = useState({}); // map book_id -> boolean

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    setLoading(true);
    const res = await getAvailableBooks();
    if (res.success) {
      setBooks(res.data.books || []);
    } else {
      setMessage({ type: "error", text: "Failed to fetch books." });
    }
    setLoading(false);
  };

  const handleIssue = async (book) => {
    if (!user?.studentId) {
      setMessage({ type: "error", text: "Please login to issue books." });
      return;
    }

    setIssuing((s) => ({ ...s, [book.book_id]: true }));
    setMessage(null);

    const res = await lendByTitle(book.title, user.studentId);

    if (res.success && res.data.success) {
      setMessage({ type: "success", text: res.data.message || "Book issued." });
      // Refresh books list to reflect decremented availability
      await fetchBooks();
    } else {
      setMessage({ type: "error", text: res.data?.message || res.error || "Issue failed" });
    }

    setIssuing((s) => ({ ...s, [book.book_id]: false }));
  };

  return (
    <div className="allbooks-page">
      <div className="allbooks-card">
        <h2>Available Books</h2>

        {message && (
          <div className={`message ${message.type}`}>{message.text}</div>
        )}

        {loading ? (
          <div className="loading">Loading books...</div>
        ) : (
          <table className="books-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Author</th>
                <th>Subject</th>
                <th>Available</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {books.length === 0 && (
                <tr>
                  <td colSpan={5} className="no-books">No books available.</td>
                </tr>
              )}

              {books.map((b) => (
                <tr key={b.book_id}>
                  <td>{b.title}</td>
                  <td>{b.author}</td>
                  <td>{b.subject}</td>
                  <td>{b.available_copies}</td>
                  <td>
                    <button
                      className="issue-btn"
                      disabled={b.available_copies <= 0 || !!issuing[b.book_id]}
                      onClick={() => handleIssue(b)}
                    >
                      {issuing[b.book_id] ? "Issuing..." : "Issue"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default AllBooks;
