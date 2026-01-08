
import React, { useState, useEffect, useCallback } from 'react';
import { Book, Page, PageStyle } from './types';
import Dashboard from './components/Dashboard';
import BookDetail from './components/BookDetail';
import Editor from './components/Editor';

const STORAGE_KEY = 'mybooklet_data';

const App: React.FC = () => {
    const [books, setBooks] = useState<Book[]>([]);
    const [currentView, setCurrentView] = useState<'dashboard' | 'book' | 'editor'>('dashboard');
    const [activeBookId, setActiveBookId] = useState<string | null>(null);
    const [activePageId, setActivePageId] = useState<string | null>(null);
    const [darkMode, setDarkMode] = useState(false);

    // Initial load
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            setBooks(JSON.parse(saved));
        } else {
            // Default sample book
            const defaultBook: Book = {
                id: '1',
                title: 'My First Journal',
                coverColor: 'bg-primary',
                isStarred: true,
                updatedAt: Date.now(),
                pages: [
                    {
                        id: 'p1',
                        title: 'Getting Started',
                        date: new Date().toLocaleDateString(),
                        summary: 'A brief summary of my first page in MYBOOKLET.',
                        content: '<h1>Welcome!</h1><p>Start writing your thoughts here...</p>',
                        style: 'lined',
                        isBookmarked: true,
                        images: []
                    }
                ]
            };
            setBooks([defaultBook]);
        }
    }, []);

    // Save on change
    useEffect(() => {
        if (books.length > 0) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
        }
    }, [books]);

    const activeBook = books.find(b => b.id === activeBookId);
    const activePage = activeBook?.pages.find(p => p.id === activePageId);

    const handleCreateBook = (title: string) => {
        const newBook: Book = {
            id: Date.now().toString(),
            title,
            coverColor: ['bg-blue-500', 'bg-red-500', 'bg-green-500', 'bg-amber-500', 'bg-purple-500'][Math.floor(Math.random() * 5)],
            isStarred: false,
            updatedAt: Date.now(),
            pages: []
        };
        setBooks(prev => [newBook, ...prev]);
    };

    const handleUpdateBook = (updatedBook: Book) => {
        setBooks(prev => prev.map(b => b.id === updatedBook.id ? updatedBook : b));
    };

    const handleUpdatePage = (updatedPage: Page) => {
        if (!activeBookId) return;
        setBooks(prev => prev.map(book => {
            if (book.id === activeBookId) {
                return {
                    ...book,
                    pages: book.pages.map(p => p.id === updatedPage.id ? updatedPage : p),
                    updatedAt: Date.now()
                };
            }
            return book;
        }));
    };

    const handleToggleStar = (id: string) => {
        setBooks(prev => prev.map(b => b.id === id ? { ...b, isStarred: !b.isStarred } : b));
    };

    const navigateToBook = (id: string) => {
        setActiveBookId(id);
        setCurrentView('book');
    };

    const navigateToEditor = (bookId: string, pageId?: string) => {
        setActiveBookId(bookId);
        if (pageId) {
            setActivePageId(pageId);
        } else {
            // Create new page
            const newPageId = Date.now().toString();
            const newPage: Page = {
                id: newPageId,
                title: 'Untitled Page',
                date: new Date().toLocaleDateString(),
                summary: '',
                content: '',
                style: 'lined',
                isBookmarked: false,
                images: []
            };
            setBooks(prev => prev.map(b => {
                if (b.id === bookId) {
                    return { ...b, pages: [newPage, ...b.pages], updatedAt: Date.now() };
                }
                return b;
            }));
            setActivePageId(newPageId);
        }
        setCurrentView('editor');
    };

    return (
        <div className={darkMode ? 'dark' : ''}>
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
                {currentView === 'dashboard' && (
                    <Dashboard 
                        books={books} 
                        onCreateBook={handleCreateBook}
                        onToggleStar={handleToggleStar}
                        onOpenBook={navigateToBook}
                        onToggleDarkMode={() => setDarkMode(!darkMode)}
                        isDarkMode={darkMode}
                    />
                )}
                {currentView === 'book' && activeBook && (
                    <BookDetail 
                        book={activeBook}
                        onBack={() => setCurrentView('dashboard')}
                        onOpenPage={(pid) => navigateToEditor(activeBook.id, pid)}
                        onCreatePage={() => navigateToEditor(activeBook.id)}
                        onUpdateBook={handleUpdateBook}
                    />
                )}
                {currentView === 'editor' && activeBook && activePage && (
                    <Editor 
                        page={activePage}
                        onBack={() => setCurrentView('book')}
                        onSave={handleUpdatePage}
                        // Fixed: Added isDarkMode prop to pass the current dark mode state to the editor
                        isDarkMode={darkMode}
                    />
                )}
            </div>
        </div>
    );
};

export default App;
