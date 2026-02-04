// API Service Layer for Library AI Backend
const API_BASE_URL = "http://localhost:5000";

// Helper function for API calls
async function apiCall(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;

    const config = {
        headers: {
            "Content-Type": "application/json",
        },
        ...options,
    };

    try {
        const response = await fetch(url, config);
        const data = await response.json();
        return { success: response.ok, data, status: response.status };
    } catch (error) {
        console.error("API Error:", error);
        return { success: false, data: null, error: error.message };
    }
}

// ============ Authentication ============

export async function login(studentId) {
    return apiCall("/login", {
        method: "POST",
        body: JSON.stringify({ student_id: studentId }),
    });
}

// ============ Smart AI Route ============

export async function smartRoute(text, studentId) {
    return apiCall("/smart_route", {
        method: "POST",
        body: JSON.stringify({ text, student_id: studentId }),
    });
}

// ============ Books ============

export async function getAvailableBooks() {
    return apiCall("/available_books", {
        method: "GET",
    });
}

export async function searchBooks(subject, tag = null) {
    return apiCall("/search_books", {
        method: "POST",
        body: JSON.stringify({ subject, tag }),
    });
}

export async function checkBook(subject) {
    return apiCall("/check_book", {
        method: "POST",
        body: JSON.stringify({ subject }),
    });
}

export async function recommendBooks(subject) {
    return apiCall("/recommend_books", {
        method: "POST",
        body: JSON.stringify({ subject }),
    });
}

// ============ Borrowing ============

export async function lendByTitle(title, studentId) {
    return apiCall("/lend_by_title", {
        method: "POST",
        body: JSON.stringify({ title, student_id: studentId }),
    });
}

export async function getActiveBorrows(studentId) {
    return apiCall("/active_borrows", {
        method: "POST",
        body: JSON.stringify({ student_id: studentId }),
    });
}

export async function returnBook(transactionId) {
    return apiCall("/return_book", {
        method: "POST",
        body: JSON.stringify({ transaction_id: transactionId }),
    });
}

// ============ Student Status ============

export async function getStudentStatus(studentId) {
    return apiCall("/student_status", {
        method: "POST",
        body: JSON.stringify({ student_id: studentId }),
    });
}

export async function getOverdueStatus(studentId) {
    return apiCall("/overdue_status", {
        method: "POST",
        body: JSON.stringify({ student_id: studentId }),
    });
}
